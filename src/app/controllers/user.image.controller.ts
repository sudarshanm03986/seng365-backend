import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as userImage from './../models/user.image.model';
import * as users from './../models/user.model';
// import { generateRandomToken } from "../services/tokenGenerator";

import {fs} from "mz";

const filepath = './storage/images/';

const getImage = async (req: Request, res: Response): Promise<void> => {
    Logger.http('GET image of the user id:' +parseInt(req.params.id, 10) )

    const id = parseInt(req.params.id, 10);

    // Check invalid id
    if (isNaN(id)) {

        res.statusMessage = "Bad Request: ID must be a Integer";
        res.status(400).send();
        return;
    }

    try{

        const [image] = await userImage.getOne(id);

        if (image === undefined) {
            res.statusMessage = "Not Found: User not found";
            res.status(404).send();
        } else if (image.image_filename === null) {
            res.statusMessage = 'Not Found: User has no Image'
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
    Logger.http('PUT image of the user id:' +parseInt(req.params.id, 10) )

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
        // Check if there is user with same id and token
        const [user] = await users.getUser(id, token);
        if (user === undefined) {
            res.statusMessage = "Not Found: ID/Token Doesn't Exist ";
            res.status(404).send();
            return;
        }



        const filetype = req.headers['content-type'].replace('image/','');
        if ( !['png', 'gif', 'jpeg'].includes(filetype)) {
            res.statusMessage = 'Bad Request: Invalid Content Type';
            res.status(400).send();
            return;
        }

        const file = req.body;
        const filename = `users_${id}.${filetype}`;

        await fs.writeFile(filepath + filename, file);

        let hasImage = false;
        // remove old image
        const [oldImage] = await userImage.getOne(id);
        if (oldImage.image_filename !== null) {
            await fs.unlink(filepath + oldImage.image_filename);
            hasImage = true
        }

        await userImage.alter(id, token, filename)

        res.status(hasImage ? 200 : 201).send();
        return;


    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deleteImage = async (req: Request, res: Response): Promise<void> => {
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
        // get image first
        const [image] = await userImage.getOne(id);

        if (image === undefined) {
            res.statusMessage = "Not Found: User not found";
            res.status(404).send();
        } else if (image.image_filename === null) {
            res.statusMessage = 'Not Found: User has no Image'
            res.status(404).send();
        } else {

            const result = await userImage.remove(id, token);

            if (result.affectedRows === 0){ // if ID and token do not line for a user then it forbidden

                res.statusMessage = 'Forbidden.'
                res.status(403).send();
            }
            else {

                await fs.unlink(filepath + image.image_filename);

                res.status(200).send()
            }



        }
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getImage, setImage, deleteImage}