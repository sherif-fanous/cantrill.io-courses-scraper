const fs = require('fs');
const util = require('util');
const zlib = require('zlib');

const Eta = require('eta');

const { analyzeCourses } = require('./lib/analytics');
const { getS3Object, putS3Object } = require('./lib/s3');
const { scrapeCourse } = require('./lib/scraper');

const { version } = require('./package.json');

const COURSES = process.env.COURSES;
const DEBUG = process.env.DEBUG || false;

Eta.configure({ autoTrim: false });

const processCourses = async (courses) => {
  const pendingPromises = [];

  console.log('Scraping courses');

  for (const certificationLevel of Object.keys(courses)) {
    for (const course of courses[certificationLevel]) {
      pendingPromises.push(scrapeCourse(course));
    }
  }

  for (const pendingPromise of pendingPromises) {
    await pendingPromise;
  }

  console.log('Scraped courses');

  console.log('Analyzing courses');

  await analyzeCourses(courses);

  console.log('Analyzed courses');
};

const putS3Objects = async (templates) => {
  console.log('Uploading templates to S3');

  for (const templateKey of Object.keys(templates)) {
    const template = templates[templateKey];

    await putS3Object(
      template.objectKey,
      template.gzippedRenderedTemplate,
      template.contentType,
      template.contentEncoding
    );
  }

  console.log('Uploaded templates to S3');
};

const renderGzipTemplates = async (templates, templateData) => {
  console.log('Rendering templates');

  for (const templateKey of Object.keys(templates)) {
    const template = templates[templateKey];

    template.renderedTemplate = Eta.render(fs.readFileSync(template.etaTemplate, { encoding: 'utf-8' }), templateData);
    template.gzippedRenderedTemplate = await util.promisify(zlib.gzip)(template.renderedTemplate);

    if (DEBUG) {
      fs.writeFileSync(`output/s3/${template.objectKey}`, template.renderedTemplate);
    }
  }

  console.log('Rendered templates');
};

exports.lambdaHandler = async () => {
  try {
    const templates = {
      indexHTML: {
        etaTemplate: 'template/html/index.html',
        objectKey: 'index.html',
        contentType: 'text/html',
        contentEncoding: 'gzip',
        renderedTemplate: '',
        gzippedRenderedTemplate: null
      },
      chartJS: {
        etaTemplate: 'template/js/index.js',
        objectKey: 'index.js',
        contentType: 'text/javascript',
        contentEncoding: 'gzip',
        renderedTemplate: '',
        gzippedRenderedTemplate: null
      }
    };

    const templateData = {
      lastUpdateDateTimeUTC: new Date().toUTCString(),
      courses: JSON.parse(await getS3Object(COURSES)),
      version: version
    };

    await processCourses(templateData.courses);

    if (DEBUG) {
      fs.writeFileSync('output/json/data.json', JSON.stringify(templateData, null, 2));
    }

    await renderGzipTemplates(templates, templateData);
    await putS3Objects(templates);
  } catch (err) {
    console.log(err);
  }
};

(async () => {
  process.env.AWS_LAMBDA_FUNCTION_NAME || this.lambdaHandler();
})();
