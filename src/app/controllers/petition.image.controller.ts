import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as petitionImage from '../models/petition.image.model'
import * as users from '../models/user.model';
import * as petitions from '../models/petition.model';

import { generateRandomToken } from "../services/tokenGenerator";

import {fs} from "mz";

const filepath = './storage/images/';

const getImage = async (req: Request, res: Response): Promise<void> => {
    Logger.http('GET image for the Petition');

    const id = parseInt(req.params.id, 10)

    if (isNaN(id)) {
        res.statusMessage = 'Bad Request: ID must be a Integer';
        res.status(400).send()
        return;
    }

    try{
        // Your code goes here
        const [image] = await petitionImage.getOne(id);

        if (image === undefined) {
            res.statusMessage = "Not Found: Petiton not found";
            res.status(404).send();
        } else if (image.image_filename === null) {
            res.statusMessage = 'Not Found: Petition has no Image'
            res.status(404).send();
        } else {

            fs.readFile(filepath + image.image_filename, (err, data) => {
                if (err) {
                    Logger.error(err);
                    res.statusMessage = "Internal Server Errordsf";
                    res.status(500).send();
                } else {
                    res
                        .status(200)
                        .contentType('image/'+ image.image_filename.split('.').pop())
                        .send(data)
                }
            })
        }


        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const setImage = async (req: Request, res: Response): Promise<void> => {
    Logger.http('PUT image of the Petition id:' +parseInt(req.params.id, 10) )

    // Check Token
    if ( req.headers['x-authorization'] === undefined) {
        res.statusMessage = 'Unauthorized: Missing token';
        res.status(401).send();
        return;
    }

    const token = req.headers['x-authorization'].toString();
    const id = parseInt(req.params.id, 10);

    // Check invalid id
    if (isNaN(id)) {

        res.statusMessage = "Bad Request: ID must be a Integer";
        res.status(400).send();
        return;
    }

    try{
        // Check if token is valid
        const [owner] = await users.findByToken(token);
        if (owner === undefined) {
            res.statusMessage = "Not Found: Owner does not exist";
            res.status(404).send();
            return;
        }

        // check if there is pitition with the id provided
        const [petition] = await petitions.getOne(id);
        if (petition === undefined) {
            res.statusMessage = "Not Found: Petition does not exist";
            res.status(404).send();
            return;
        }
        // Check is owner is the actual owner of the petition
        if (petition.ownerId !== owner.id) {
            res.statusMessage = "Unauthorized: this Petition owned by someone else"
            res.status(401).send();
            return;
        }


        const filetype = req.headers['content-type'].replace('image/','');
        if ( !['png', 'gif', 'jpeg'].includes(filetype)) {
            res.statusMessage = 'Bad Request: Invalid Content Type';
            res.status(400).send();
            return;
        }

        const file = req.body;
        const filename = `petition_${id}.${filetype}`;

        await fs.writeFile(filepath + filename, file);




        let hasImage = false;
        // remove old image
        const [oldImage] = await petitionImage.getOne(id);
        if (oldImage.image_filename !== null) {
            await fs.unlink(filepath + oldImage.image_filename);
            hasImage = true;
        }

        await petitionImage.alter(id, owner.id , filename)

        res.status(hasImage ? 200 : 201).send();
        return;


    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


export {getImage, setImage};