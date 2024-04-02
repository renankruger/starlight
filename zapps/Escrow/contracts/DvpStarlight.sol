// SPDX-License-Identifier: Apache License 2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./EscrowShield.sol";
import "hardhat/console.sol";

contract DvpStarlight is AccessControl{


    using Counters for Counters.Counter;

    Counters.Counter private _proposalIdCounter;

    event EncryptedDataDvPStarted(address sender, uint256[] cipherText, uint256[2] ephPublicKey);

    enum TransactionStatus {
        UNKNOWN,
        REGISTERED,
        CONFIRMED,
        EXECUTED,
        CANCELLED
    }

    struct DvPTransaction {
        Inputs inputs;
        uint256[] proof;
        bytes32 proofHash;
        TransactionStatus status;
        address assetAddress;
        address counterparty;
    }

    mapping(address => DvPTransaction) dvpProposals;  
    
    function startDvp(Inputs calldata inputs, bytes32 proofHash, address assetAddress) public{
        
        dvpProposals[_msgSender()].inputs = inputs;
        dvpProposals[_msgSender()].assetAddress = assetAddress;
        dvpProposals[_msgSender()].proofHash = proofHash;
        dvpProposals[_msgSender()].status = TransactionStatus.REGISTERED;

        EscrowShield(assetAddress).lockProof(proofHash);

        for (uint j; j < inputs.cipherText.length; j++) {
            // this seems silly (it is) but its the only way to get the event to emit properly
            uint256[2] memory ephKeyToEmit = inputs.encKeys[j];
            uint256[] memory cipherToEmit = inputs.cipherText[j];
            emit EncryptedDataDvPStarted(_msgSender(), cipherToEmit, ephKeyToEmit);
        }

    }

    function confirmDvp(uint256[] calldata proof, address counterparty) public{
        require(dvpProposals[_msgSender()].status != TransactionStatus.CANCELLED && dvpProposals[dvpProposals[_msgSender()].counterparty].status!=TransactionStatus.EXECUTED,"DvP cannot be confirmed");
        // Counterparty must be the same as sender before confirm
        bytes32 proofHash = keccak256(abi.encodePacked(proof));
        if (dvpProposals[_msgSender()].proofHash == proofHash){
            dvpProposals[_msgSender()].status = TransactionStatus.CONFIRMED;
            dvpProposals[_msgSender()].proof=proof;
            dvpProposals[_msgSender()].counterparty = counterparty;
        }
        else{
            revert("Hash do not match DvP proposal");
        }
        if ((dvpProposals[_msgSender()].status == TransactionStatus.CONFIRMED) && (dvpProposals[dvpProposals[_msgSender()].counterparty].status == TransactionStatus.CONFIRMED)){
            executeDvP();
        }
        
    }

    function executeDvP() private{
        
        dvpProposals[_msgSender()].status = TransactionStatus.EXECUTED;
        dvpProposals[dvpProposals[_msgSender()].counterparty].status = TransactionStatus.EXECUTED;
        
        EscrowShield(dvpProposals[_msgSender()].assetAddress).transfer(
            dvpProposals[_msgSender()].inputs,
            dvpProposals[_msgSender()].proof);

        EscrowShield(dvpProposals[dvpProposals[_msgSender()].counterparty].assetAddress).transfer(
            dvpProposals[dvpProposals[_msgSender()].counterparty].inputs,
            dvpProposals[dvpProposals[_msgSender()].counterparty].proof);
    }

    function cancelDvP() public{
        require(dvpProposals[_msgSender()].status != TransactionStatus.CANCELLED && dvpProposals[_msgSender()].status!=TransactionStatus.EXECUTED,"DvP cannot be cancelled");
        dvpProposals[_msgSender()].status = TransactionStatus.CANCELLED;
        dvpProposals[dvpProposals[_msgSender()].counterparty].status = TransactionStatus.CANCELLED;
    }

}