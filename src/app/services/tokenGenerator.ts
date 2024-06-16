import crypto from 'crypto';

const generateRandomToken = (length: number) =>  {

    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

export{generateRandomToken}