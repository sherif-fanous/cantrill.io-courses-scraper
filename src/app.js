const fs = require('fs');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Eta = require('eta');

const { scrapeCourse } = require('./lib/scraper');

const AWS_REGION = process.env.AWS_REGION;
const COURSES = process.env.COURSES;
const ETA_TEMPLATE = fs.readFileSync('template/index.eta', { encoding: 'utf-8' });
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

const s3Client = new S3Client({ region: AWS_REGION });

Eta.configure({ autoTrim: false });

const putS3Object = async (data) => {
  const putObjectCommand = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: 'index.html',
    Body: Eta.render(ETA_TEMPLATE, data),
    ContentType: 'text/html'
  });

  await s3Client.send(putObjectCommand);
};

exports.lambdaHandler = async () => {
  try {
    const data = {
      lastUpdateDateTimeUTC: new Date().toUTCString(),
      courses: JSON.parse(COURSES)
    };

    const pendingPromises = [];

    for (const certificationLevel of Object.keys(data.courses)) {
      for (const course of data.courses[certificationLevel]) {
        pendingPromises.push(scrapeCourse(course));
      }
    }

    for (const pendingPromise of pendingPromises) {
      await pendingPromise;
    }

    await putS3Object(data);
  } catch (err) {
    console.log(err);
  }
};
