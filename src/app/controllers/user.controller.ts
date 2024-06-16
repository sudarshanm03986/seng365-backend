import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as bcrypt from '../services/passwords';
import * as schemas from '../resources/schemas.json';
import { validate } from "../services/validate";
import * as users from '../models/user.model';
import { generateRandomToken } from "../services/tokenGenerator";


const register = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`POST create a user with name: ${req.body.firstName} ${req.body.lastName}`);

    // validation
    const validation = await validate(
        schemas.user_register,
        req.body);

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return
    }

    // varaiable
    const email = req.body.email;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    // encrypt the the password
    const password = await bcrypt.hash(req.body.password);

    try{

        const result = await users.insert(email, firstName, lastName, password)
        res.status(201).send({'userId': result.insertId});
        return;

    } catch (err) {
        Logger.error(err)
        if (err.code === 'ER_DUP_ENTRY') { // Duplicate entry MySQL error number
            res.statusMessage = "Forbidden: Email already exists in the database";
            res.status(403).send();
            return;
        } else {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
            return;
        }
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`POST login user with email: ${req.body.email}`);

    // validation
    const validation = await validate(
        schemas.user_login,
        req.body);

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return
    }

    const email = req.body.email;
    const password = req.body.password;

    try{

        // Get user by email
        const [requestedUser] = await users.findByEmail(email);

        // check if user is invalid
        if (requestedUser === undefined || !(await bcrypt.compare(password, requestedUser.password)).valueOf()) {
            res.statusMessage = "Unauthorized: Incorrect email/password";
            res.status(401).send();
            return;
        }

        // Token
        const token = generateRandomToken(64);        // 64 lenght
        await users.setToken(requestedUser.id, token);

        // retrun
        res.status(200).send({"userId": requestedUser.id, "token": token});
        return;


    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {

    Logger.http(`POST logout user with Token`);

    // Check Token
    if ( req.headers['x-authorization'] === undefined) {
        res.statusMessage = 'Unauthorized: Missing token';
        res.status(401).send();
        return;
    }

    const token = req.headers['x-authorization'].toString();

    try{
        // Your code goes here
        const result = await users.removeToken(token);

        if (result.affectedRows === 0 ) {
            res.statusMessage = 'Bad request: Account not Logged in';
            res.status(400).send();
        } else {
            res.statusMessage = 'Logout Succesful';
            res.status(200).send();
        }

        return;



    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const view = async (req: Request, res: Response): Promise<void> => {

    Logger.http(`GET user with ID: ${parseInt(req.params.id, 10)}`);

    // Check Token
    const hasToken = (req.headers['x-authorization'] !== undefined)

    // Variable
    const id = parseInt(req.params.id, 10);
    const token = hasToken ? req.headers['x-authorization'].toString(): undefined;

    // Check invalid id
    if (isNaN(id)) {

        res.statusMessage = "Bad Request: ID must be a Integer";
        res.status(400).send();
        return;
    }

    try{


        const [user] = await users.getUser(id, token);

        if ( user === undefined) { // If user is undefiend the request is to get another user information

            // another user
            const[anotherUser] = await users.getAnotherUser(id);
            if (anotherUser === undefined) {
                res.statusMessage = "Unauthorized: Incorrect Id/Token";
                res.status(401).send();
            }
            else {
                res.status(200).send({
                    "firstName": anotherUser.first_name,
                    "lastName": anotherUser.last_name})
            }

        }


        else {

            res.status(200).send({  "email": user.email,
                                    "firstName": user.first_name,
                                    "lastName": user.last_name      });
        }

        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const update = async (req: Request, res: Response): Promise<void> => {

    Logger.http(`PATCH update user information with ID: ${parseInt(req.params.id, 10)} and Token`);

     // validation
    const validation = await validate(
        schemas.user_edit,
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

    const id = parseInt(req.params.id, 10);
    const userNewData:UserUpdate = req.body;
    const token = req.headers['x-authorization'].toString();


    // Check invalid id
    if (isNaN(id)) {

        res.statusMessage = "Bad Request: ID must be a Integer";
        res.status(400).send();
        return;
    }



    // Check password
    if ((userNewData.password !== undefined && userNewData.currentPassword === undefined)
    || (userNewData.password === undefined && userNewData.currentPassword !== undefined)) {
        res.statusMessage = 'Bad Request: Password and Current Password Field ';
        res.status(400).send();
        return;
    }

    try{

        // Check if there is user with same id and token
        const [user] = await users.getUser(id, token);
        if (user === undefined) {
            res.statusMessage = "Unauthorized: Incorrect Id/Token";
            res.status(401).send();
            return;
        }


         // Password
         if (userNewData.password !== undefined) {

            const hashPassword = (await users.findByEmail(user.email))[0].password; // Get Current Hash password

            if  ( ! (await bcrypt.compare(userNewData.currentPassword, hashPassword))) { // Check if Current password match
                res.statusMessage = 'Unauthorized: Invalid current password ';
                res.status(401).send();
                return;
            }

            else if (userNewData.password === userNewData.currentPassword) { // Check if Same Password
                res.statusMessage = 'Forbidden: Same Current password and New password';
                res.status(403).send();
                return;
            }

            else {  // every thing valid
                userNewData.password = await bcrypt.hash( userNewData.password);
            }

        }

        await users.alter(userNewData, id, token);
        res.status(200).send();

        return;


    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


export {register, login, logout, view, update}