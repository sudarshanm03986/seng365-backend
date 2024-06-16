import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as schemas from '../resources/schemas.json';
import { validate } from "../services/validate";

import * as petitions from '../models/petition.model'
import * as support_tiers from '../models/petition.support_tier.model'
import * as supporter from '../models/petition.supporter.model'
import {findByToken} from "../models/user.model";


const getAllPetitions = async (req: Request, res: Response): Promise<void> => {

    Logger.http(`GET all Petitions that meets body criteria`);
     // validation
     const validation = await validate(
        schemas.petition_search,
        req.query);

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return
    }



    const query: PetitionQuery = {
        q: req.query.q === undefined ? null : req.query.q.toString(),
        ownerId: req.query.ownerId === undefined ? null : parseInt( req.query.ownerId.toString(), 10),
        supporterId: req.query.supporterId === undefined ? null : parseInt(req.query.supporterId.toString(), 10),
        supportingCost: req.query.supportingCost === undefined ? null : parseInt(req.query.supportingCost.toString(), 10),
        sortBy: req.query.sortBy === undefined ? null : req.query.sortBy.toString()
    }


    // CATEGORY
    let categoryId = ''
    if (Array.isArray(req.query.categoryIds)) {
        categoryId += '('
        categoryId += req.query.categoryIds.map ( (id, index): string => ' ' + id.toString());
        categoryId += ')'
    }
    else if (req.query.categoryIds !== undefined) {
        categoryId = '(' + req.query.categoryIds.toString() + ')';
    }
    else {
        categoryId = null;
    }

    try{

        const allPetitions = await petitions.getAll(query , categoryId);


        const start = (req.query.startIndex !== undefined ? parseInt(req.query.startIndex.toString(), 10) : 0);
        const end = (req.query.count !== undefined ? (start + parseInt(req.query.count.toString(), 10)) : undefined);


        res.status(200).send({
                            'count': allPetitions.length,
                            'petitions' : allPetitions.slice(start, end),
                            })

        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const getPetition = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`GET Petitions with the request ID`);

    const id = parseInt(req.params.id, 10)

    if (isNaN(id)) {
        res.statusMessage = 'Bad Request: ID must be a Integer';
        res.status(400).send()
        return;
    }

    try{

        // get the Petition
        const [petition] = await petitions.getOne(id);

        if (petition === undefined) {

            res.statusMessage = 'Not Found: ID dose not exist';
            res.status(404).send()
            return;
        }

        // get the Suppoter teir

        const supportTiers = await support_tiers.getByPetition(petition.petitionId);


        const numOfSupporter = (await supporter.getAllByPetitionId(petition.petitionId)).length;

        res.status(200).send({'petitionId': petition.petitionId,
                            'title': petition.title,
                            'categoryId': petition.categoryId,
                            'ownerId': petition.ownerId,
                            'ownerFirstName': petition.ownerFirstName,
                            'ownerLastName' : petition.ownerLastName,
                            'numberOfSupporters' : numOfSupporter,
                            'creationDate' : petition.creationDate,
                            'description': petition.description,
                            'moneyRaised' : petition.moneyRaised ,
                            'supportTiers':supportTiers });
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addPetition = async (req: Request, res: Response): Promise<void> => {
    Logger.http('POST create a new Petition')

    // validation
    const validation = await validate(
        schemas.petition_post,
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

    const title = req.body.title;
    const description = req.body.description;
    const categoryId = parseInt(req.body.categoryId, 10);
    const supportTier : supportTiersCreate[] = req.body.supportTiers;

    try{

        // get owner id by token
        const [owner] = (await findByToken(token));

        // check if the token was valid or not
        if (owner === undefined) {
            res.statusMessage = 'Unauthorized.';
            res.status(401).send();
            return;
        }

        // inserst the Petitions
        const petitionResult =  await petitions.insertPetition(title, description, owner.id,  categoryId );

        // // Insert all the Support Tier
        for (const tier of supportTier) {
            await support_tiers.insert( tier , petitionResult.insertId);
        }

        // send back status
        res.status(201).send({'petitionId' : petitionResult.insertId, });
        return;


    } catch (err) {
        Logger.error(err);
        if (err.code === 'ER_DUP_ENTRY') { // Duplicate entry MySQL error number
            res.statusMessage = "Forbidden: This Petition already exist";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

const editPetition = async (req: Request, res: Response): Promise<void> => {
    Logger.http('PATCH petition with matchign id and token')

    // validation
    const validation = await validate(
        schemas.petition_patch,
        req.body);

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return;
    }

     // token Defined
     if (req.headers['x-authorization'] === undefined) {
        res.statusMessage = 'Unauthorized.';
        res.status(401).send();
        return;
    }

    const token = req.headers['x-authorization'].toString();
    const id = parseInt(req.params.id, 10);

    // id valid
    if (isNaN(id)) {
        res.statusMessage = 'Bad Request: ID must be a Integer';
        res.status(400).send()
        return;
    }

    const petitionNewData : PetitionUpdate = req.body;

    try{
        // get owner id by token
        const [owner] = (await findByToken(token));

        // check if the token and id are valid
        if (owner === undefined) {
            res.statusMessage = 'Unauthorized.';
            res.status(401).send();
            return;
        }

        // Update User
        const result = await petitions.alter(petitionNewData, owner, id);

        if (result.affectedRows === 0) {
            res.statusMessage = 'Not Found: Doesnt exist';
            res.status(404).send();
            return;


        } else{

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

const deletePetition = async (req: Request, res: Response): Promise<void> => {
    Logger.http('DELETE petition with matchign id and token')

     // token Defined
     if (req.headers['x-authorization'] === undefined) {
        res.statusMessage = 'Unauthorized.';
        res.status(401).send();
        return;
    }

    const token = req.headers['x-authorization'].toString();
    const id = parseInt(req.params.id, 10);

    // id valid
    if (isNaN(id)) {
        res.statusMessage = 'Bad Request: ID must be a Integer';
        res.status(400).send()
        return;
    }

    try{

        // get owner id by token
        const [owner] = (await findByToken(token));

        // check if the token and id are valid
        if (owner === undefined) {
            res.statusMessage = 'Unauthorized.';
            res.status(401).send();
            return;
        }

        // Check if the Petitions has supporter
        if (((await supporter.getAllByPetitionId(id)).length !== 0)) {
            res.statusMessage = 'Forbidden: Supporter Exist';
            res.status(403).send();
            return;

        }

        const result = await petitions.remove(id, owner.id);

        if (result.affectedRows === 0) {
            res.statusMessage = 'Not found:  Doesnt exist';
            res.status(404).send();
            return;
        }
        else {

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

const getCategories = async(req: Request, res: Response): Promise<void> => {
    try{

        const categories = await petitions.categories();
        res.status(200).send(categories);
        return;

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}



export {getAllPetitions, getPetition, addPetition, editPetition, deletePetition, getCategories};