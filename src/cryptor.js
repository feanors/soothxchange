require('dotenv').config();

const crypto = require("crypto");
const algorithm = "aes-256-ctr";
const secretKey = process.env.SKEY; 
const iv = crypto.randomBytes(16);


exports.encrypt = function(data) {
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    }
}

exports.decrypt = function(hash) {
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, 'hex'));
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);

    return decrpyted.toString();
};