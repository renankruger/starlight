import {
  service_allCommitments,
  service_getCommitmentsByState,
} from './api_services.mjs';

import express from 'express';

export class Router {
  constructor(serviceMgr) {
    this.serviceMgr = serviceMgr;
  }

  addRoutes() {
    const router = express.Router();

    router.post('/mint', this.serviceMgr.service_mint.bind(this.serviceMgr));
    router.post(
      '/approve',
      this.serviceMgr.service_approve.bind(this.serviceMgr),
    );
    router.get(
      '/balanceOf',
      this.serviceMgr.service_balanceOf.bind(this.serviceMgr),
    );

    router.post(
      '/deposit',
      this.serviceMgr.service_deposit.bind(this.serviceMgr),
    );

    // eslint-disable-next-line func-names
    router.post(
      '/transfer',
      this.serviceMgr.service_transfer.bind(this.serviceMgr),
    );

    // eslint-disable-next-line func-names
    router.post(
      '/withdraw',
      this.serviceMgr.service_withdraw.bind(this.serviceMgr),
    );

    // commitment getter routes
    router.get('/getAllCommitments', service_allCommitments);
    router.get('/getCommitmentsByVariableName', service_getCommitmentsByState);

    return router;
  }
}
