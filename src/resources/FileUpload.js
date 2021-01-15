"use strict";
const AWS = require("aws-sdk");
const debug = {
  error: require("debug")("formio:error")
};

const SUCCESS_ACTION_STATUS = "201";
const ACL = "public-read";

const sign = async (req, res) => {
  try {
    const { name, type } = req.body;
    const fileName = name;
    const fileType = type;
    const key = `${req.hostname}`.replace(/\./g,'-');

    const s3 = new AWS.S3({ signatureVersion: "v4" });

    const signedFile = await new Promise((resolve, reject) => {
      s3.createPresignedPost(
        {
          Bucket: process.env.AWS_BUCKET,
          Fields: {
            key: `${key}/${fileName}`,
            acl: ACL,
            "Content-Type": fileType,
            success_action_status: SUCCESS_ACTION_STATUS,
          },
          Expires: 60,
          Conditions: [
            ["starts-with", "$key", `${key}/${fileName}`],
            { bucket: process.env.AWS_BUCKET },
            { acl: ACL },
            ["starts-with", "$Content-Type", fileType],
            { success_action_status: SUCCESS_ACTION_STATUS },
            { fileName },
          ],
        },
        (err, data) => {
          if (err) {
            reject(err);
          }
          resolve(data);
        }
      );
    });

    res.json({
      url: signedFile.url,
      data: { ...signedFile.fields, key }, // Replace key with only host name, since formio.js in client is appending file name and file path
    });
  } catch (err) {
    debug.error(err);
    res.status(500).json("Unable to upload file");
  }
};

module.exports = sign;
