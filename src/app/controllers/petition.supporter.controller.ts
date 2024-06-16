import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as schemas from '../resources/schemas.json';
import { validate } from "../services/validate";

import * as supporter from '../models/petition.supporter.model';
import {findByToken} from "../models/user.model";
import * as petitions from '../models/petition.model';



const getAllSupportersForPetition = async (req: Request, res: Response): Promise<void> => {
    Logger.http('GET all the suppoter that is supporting petitions Id')

    const id = parseInt(req.params.id, 10)

    if (isNaN(id)) {
        res.statusMessage = 'Bad Request: ID must be a Integer';
        res.status(400).send()
        return;
    }

    try{

        const petitionSupporter = await supporter.getAllByPetitionId(id);

        res.status(200).send(petitionSupporter);


    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addSupporter = async (req: Request, res: Response): Promise<void> => {
    Logger.http('POST add a new supporter')

    // validation
    const validation = await validate(
        schemas.support_post,
        req.body);

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return
    }

     // token Defined
     if (req.headers['x-authorization'] === undefined) {
        res.statusMessage = 'Unauthorized.';
        res.status(401).send();
        return;
    }

    const token = req.headers['x-authorization'].toString();
    const id = parseInt(req.params.id, 10);
    const tierId = req.body.supportTierId;
    const message = req.body.message;


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
         if (petition === undefined || petition.petitionId === null) {
             res.statusMessage = 'Not Found: ID dose not exist';
             res.status(404).send()
             return;
         }

         // Check if owner is trying to suppoert it own petition
         if (petition.ownerId === owner.id) {
             res.statusMessage = 'Forbidden: Own Petition';
             res.status(403).send()
             return;
         }

        await supporter.insert(id, tierId, owner.id, message);

        res.status(201).send();
        return;

    } catch (err) {
        Logger.error(err)
        if (err.code === 'ER_DUP_ENTRY') { // Duplicate entry MySQL error number
            res.statusMessage = "Forbidden: You have already Supported this petition ";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

export {getAllSupportersForPetition, addSupporter}