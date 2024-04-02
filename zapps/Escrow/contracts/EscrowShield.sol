// SPDX-License-Identifier: CC0

pragma solidity ^0.8.0;

import './verify/IVerifier.sol';
import './merkle-tree/MerkleTree.sol';
import './IERC20.sol';
import 'truffle/console.sol';

contract EscrowShield is MerkleTree {
    enum FunctionNames {
        deposit,
        transfer,
        withdraw,
        joinCommitments
    }

    IVerifier private verifier;

    mapping(uint256 => uint256[]) public vks; // indexed to by an enum uint(FunctionNames)

    event EncryptedData(uint256[] cipherText, uint256[2] ephPublicKey);

    mapping(uint256 => uint256) public nullifiers;

    mapping(uint256 => uint256) public commitmentRoots;

    mapping(bytes32 => address) lockedProofs;

    uint256 public latestRoot;

    mapping(address => uint256) public zkpPublicKeys;

    struct Inputs {
        uint[] newNullifiers;
        uint commitmentRoot;
        uint[] newCommitments;
        uint[][] cipherText;
        uint[2][] encKeys;
        uint[] customInputs;
    }

    function registerZKPPublicKey(uint256 pk) external {
        zkpPublicKeys[msg.sender] = pk;
    }

    function lockProof(bytes32 proofHash) public {
        lockedProofs[proofHash] = msg.sender;
    }

    function verify(
        uint256[] memory proof,
        uint256 functionId,
        Inputs memory _inputs
    ) private {
        console.log('verify - 1');
        uint[] memory customInputs = _inputs.customInputs;

        uint[] memory newNullifiers = _inputs.newNullifiers;

        uint[] memory newCommitments = _inputs.newCommitments;

        for (uint i; i < newNullifiers.length; i++) {
      			uint n = newNullifiers[i];
      			require(nullifiers[n] == 0, "Nullifier already exists");
      			nullifiers[n] = n;
      		}

        require(
            commitmentRoots[_inputs.commitmentRoot] == _inputs.commitmentRoot,
            'Input commitmentRoot does not exist.'
        );
        console.log('verify - 2');

        uint encInputsLen = 0;

        for (uint i; i < _inputs.cipherText.length; i++) {
            encInputsLen += _inputs.cipherText[i].length + 2;
        }
        console.log('verify - 3');

        uint256[] memory inputs = new uint256[](
            customInputs.length +
                newNullifiers.length +
                (newNullifiers.length > 0 ? 1 : 0) +
                newCommitments.length +
                encInputsLen
        );

        if (functionId == uint(FunctionNames.deposit)) {
            uint k = 0;

            inputs[k++] = customInputs[0];
            inputs[k++] = newCommitments[0];
            inputs[k++] = 1;
        }
        console.log('verify - 4');

        if (functionId == uint(FunctionNames.transfer)) {
            uint k = 0;
            inputs[k++] = newNullifiers[0];
            inputs[k++] = newNullifiers[1];
            inputs[k++] = _inputs.commitmentRoot;
            inputs[k++] = newCommitments[0];
            inputs[k++] = newCommitments[1];
            for (uint j; j < _inputs.cipherText[0].length; j++) {
                inputs[k++] = _inputs.cipherText[0][j];
            }
            inputs[k++] = _inputs.encKeys[0][0];
            inputs[k++] = _inputs.encKeys[0][1];
        }
        console.log('verify - 5');

        if (functionId == uint(FunctionNames.withdraw)) {
            uint k = 0;

            inputs[k++] = customInputs[0];
            inputs[k++] = newNullifiers[0];
            inputs[k++] = newNullifiers[1];
            inputs[k++] = _inputs.commitmentRoot;
            inputs[k++] = newCommitments[0];
            inputs[k++] = 1;
        }
        console.log('verify - 6');

        if (functionId == uint(FunctionNames.joinCommitments)) {

            uint k = 0;
            inputs[k++] = newNullifiers[0];
            inputs[k++] = newNullifiers[1];
            inputs[k++] = _inputs.commitmentRoot;
            inputs[k++] = newCommitments[0];
            inputs[k++] = 1;
        }
        console.log('verify - 7');

        bool result = verifier.verify(proof, inputs, vks[functionId]);

        require(result, 'The proof has not been verified by the contract');

        console.log('The proof has been successfully verified by the contract');
        if (newCommitments.length > 0) {
            console.log('adding new commitments');
            latestRoot = insertLeaves(newCommitments);
            commitmentRoots[latestRoot] = latestRoot;
        } else {
            console.log('no new commitments to add');
        }
    }

    function joinCommitments(
        uint256[] calldata newNullifiers,
        uint256 commitmentRoot,
        uint256[] calldata newCommitments,
        uint256[] calldata proof
    ) public {
        Inputs memory inputs;

        inputs.customInputs = new uint[](1);
        inputs.customInputs[0] = 1;

        inputs.newNullifiers = newNullifiers;

        inputs.commitmentRoot = commitmentRoot;

        inputs.newCommitments = newCommitments;

        verify(proof, uint(FunctionNames.joinCommitments), inputs);
    }

    IERC20 public erc20;

    constructor(
        address _erc20,
        address verifierAddress,
        uint256[][] memory vk
    ) {
        verifier = IVerifier(verifierAddress);
        for (uint i = 0; i < vk.length; i++) {
            vks[i] = vk[i];
        }
        erc20 = IERC20(_erc20);
    }

    function deposit(
        uint256 amount,
        uint256[] calldata newCommitments,
        uint256[] calldata proof
    ) public {
        console.log(
            'calling transferFrom: sender=%o, amount=%d',
            msg.sender,
            amount
        );
        bool hasBalance = erc20.transferFrom(msg.sender, address(this), amount);
        require(hasBalance == true);

        Inputs memory inputs;

        inputs.customInputs = new uint[](2);
        inputs.customInputs[0] = amount;
        inputs.customInputs[1] = 1;

        inputs.newCommitments = newCommitments;

        console.log('Calling verify');
        verify(proof, uint(FunctionNames.deposit), inputs);
    }

    function transfer(Inputs calldata inputs, uint256[] calldata proof) public {
        console.log('Calling verify');
        bytes32 proofHash = keccak256(abi.encodePacked(proof));
        if (lockedProofs[proofHash] != address(0)){
            require(lockedProofs[proofHash]==msg.sender, "Proof is locked");
        }
        verify(proof, uint(FunctionNames.transfer), inputs);

        for (uint j; j < inputs.cipherText.length; j++) {
            // this seems silly (it is) but its the only way to get the event to emit properly
            uint256[2] memory ephKeyToEmit = inputs.encKeys[j];
            uint256[] memory cipherToEmit = inputs.cipherText[j];
            emit EncryptedData(cipherToEmit, ephKeyToEmit);
        }
    }

    function withdraw(
        uint256 amount,
        uint256[] calldata newNullifiers,
        uint256 commitmentRoot,
        uint256[] calldata newCommitments,
        uint256[] calldata proof
    ) public {
        bool success = erc20.transfer(msg.sender, amount);
        require(success, 'ERC20 transfer failed');

        Inputs memory inputs;

        inputs.customInputs = new uint[](2);
        inputs.customInputs[0] = amount;
        inputs.customInputs[1] = 1;

        inputs.newNullifiers = newNullifiers;

        inputs.commitmentRoot = commitmentRoot;

        inputs.newCommitments = newCommitments;

        verify(proof, uint(FunctionNames.withdraw), inputs);
    }
}
