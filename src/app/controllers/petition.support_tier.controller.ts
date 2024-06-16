import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as schemas from '../resources/schemas.json';
import { validate } from "../services/validate";

import * as supportTiers from '../models/petition.support_tier.model';
import {findByToken} from "../models/user.model";
import * as petitions from '../models/petition.model';
import * as suppoter from "../models/petition.supporter.model";


const addSupportTier =  async (req: Request, res: Response): Promise<void> => {
    Logger.http('PUT the new supportier to a Petition');

     // validation
    const validation = await validate(
        schemas.support_tier_post,
        req.body);

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return
    }


     // Check Token
    if ( req.headers['x-authorization'] === undefined) {
        res.statusMessage = 'Unauthorized';
        res.status(401).send();
        return;
    }

    const token = req.headers['x-authorization'].toString();
    const id = parseInt(req.params.id, 10)
    const tier:supportTiersCreate = req.body;

    if (isNaN(id)) {
        res.statusMessage = 'Bad Request: ID must be a Integer';
        res.status(400).send()
        return;
    }


    try{

         // get owner id by token
         const [owner] = (await findByToken(token));

         // check if the token was valid or not
         if (owner === undefined ) {
             res.statusMessage = 'Unauthorized.';
             res.status(401).send();
             return;
         }

          // get the Petition
        const [petition] = await petitions.getOne(id);

        // check if Petition exist
        if (petition === undefined) {
            res.statusMessage = 'Not Found: ID dose not exist';
            res.status(404).send()
            return;
        }

        // Check if teh request is from authorised user
        if (petition.ownerId !== owner.id) {
            res.statusMessage = 'Forbidden.';
            res.status(403).send()
            return;
        }

        // Check support tier have reach the limit
        if ((await supportTiers.getByPetition(id)).length < 3) {

            await supportTiers.insert(tier, id);
            res.status(201).send()
            return;

        }
        else {
            res.statusMessage = 'Forbidden: You have reached Max Support tier';
            res.status(403).send()
            return;
         }


    } catch (err) {
        Logger.error(err)
        if (err.code === 'ER_DUP_ENTRY') { // Duplicate entry MySQL error number
            res.statusMessage = "Forbidden: Support title not unique within petition ";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

const editSupportTier = async (req: Request, res: Response): Promise<void> => {
    Logger.http('PATCH the supportier with petitionId and tierId');

    // validation
    const validation = await validate(
        schemas.support_tier_patch,
        req.body);

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return
    }

     // Check Token
    if ( req.headers['x-authorization'] === undefined) {
        res.statusMessage = 'Unauthorized';
        res.status(401).send();
        return;
    }

    const token = req.headers['x-authorization'].toString();
    const id = parseInt(req.params.id, 10)
    const idTier = parseInt(req.params.tierId, 10)
    const newTier:supportTiersCreate = req.body;

    if (isNaN(id) || isNaN(idTier)) {
        res.statusMessage = 'Bad Request: ID must be a Integer';
        res.status(400).send()
        return;
    }

    try {

        // get owner id by token
        const [owner] = (await findByToken(token));

        // check if the token was valid or not
        if (owner === undefined ) {
            res.statusMessage = 'Unauthorized.';
            res.status(401).send();
            return;
        }

        // get the Petition
        const [petition] = await petitions.getOne(id);

        // check if Petition exist
        if (petition === undefined) {
            res.statusMessage = 'Not Found: ID dose not exist';
            res.status(404).send()
            return;
        }

        // Check if the request is from authorised user
        if (petition.ownerId !== owner.id) {
            res.statusMessage = 'Forbidden: ';
            res.status(403).send()
            return;
        }

        //
        if ((await suppoter.getAllByPetitionId(id)).length !== 0 ) {
            res.statusMessage = 'Forbidden: Supporter Exist';
            res.status(403).send();
            return;


        }

        const result = await supportTiers.alter(id, idTier, newTier);

        if (result.affectedRows === 0 ) {
            res.statusMessage = 'Not Found: Tier not found';
            res.status(404).send();
            return;
        } else {

            res.status(200).send();
            return;
        }



    } catch (err) {
        Logger.error(err)
        if (err.code === 'ER_DUP_ENTRY') { // Duplicate entry MySQL error number
            res.statusMessage = "Forbidden: Support title not unique within petition ";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

const deleteSupportTier = async (req: Request, res: Response): Promise<void> => {
    Logger.http('DELETE a support tier by Petition ID and Tier ID');
     // Check Token
     if ( req.headers['x-authorization'] === undefined) {
        res.statusMessage = 'Unauthorized';
        res.status(401).send();
        return;
    }

    const token = req.headers['x-authorization'].toString();
    const id = parseInt(req.params.id, 10)
    const idTier = parseInt(req.params.tierId, 10)

    if (isNaN(id) || isNaN(idTier)) {
        res.statusMessage = 'Bad Request: ID must be a Integer';
        res.status(400).send()
        return;
    }

    try{

         // get owner id by token
         const [owner] = (await findByToken(token));

         // check if the token was valid or not
         if (owner === undefined ) {
             res.statusMessage = 'Unauthorized.';
             res.status(401).send();
             return;
         }

         // get the Petition
         const [petition] = await petitions.getOne(id);

         // check if Petition exist
         if (petition === undefined) {
             res.statusMessage = 'Not Found: ID dose not exist';
             res.status(404).send()
             return;
         }

         // Check if the request is from authorised user
         if (petition.ownerId !== owner.id) {
             res.statusMessage = 'Forbidden: ';
             res.status(403).send()
             return;
         }


         const result =  await supportTiers.remove(idTier, id);

         if (result.affectedRows === 0) {
            res.statusMessage = 'Not Found: Support tier does not exist';
            res.status(404).send();
            return;
         } else {
            res.status(200).send();
            return;
         }



    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


export {addSupportTier, editSupportTier, deleteSupportTier};