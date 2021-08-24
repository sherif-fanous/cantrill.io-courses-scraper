const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const AWS_REGION = process.env.AWS_REGION;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

const s3Client = new S3Client({ region: AWS_REGION });

exports.putS3Object = async (objectKey, objectBody, contentType, contentEncoding) => {
  const putObjectCommand = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: objectKey,
    Body: objectBody,
    ContentType: contentType,
    ContentEncoding: contentEncoding
  });

  await s3Client.send(putObjectCommand);
};
