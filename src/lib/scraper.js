const { JSDOM } = require('jsdom');

const { secondsToHHMMSS } = require('./helpers/time-format.js');

const extractLectureTitleWithDuration = (sectionItemTextContent) => {
  const nonEmptyTokens = [];

  for (const sectionItemTextContentToken of sectionItemTextContent.split('\n')) {
    const trimmedSectionItemTextContentToken = sectionItemTextContentToken.trim();

    if (trimmedSectionItemTextContentToken) {
      nonEmptyTokens.push(trimmedSectionItemTextContentToken);
    }
  }

  /*
   * Cloudflare obfuscates Lamba@Edge. Manually replace the obfuscation.
   */
  return nonEmptyTokens
    .slice(1)
    .join(' ')
    .replace(/\[email\s+protected\]*/, 'Lambda@Edge');
};

const extractSectionTitle = (sectionTitleTextContent) => {
  for (const sectionTitleTextContentToken of sectionTitleTextContent.split('\n')) {
    const trimmedSectionTitleTextContentToken = sectionTitleTextContentToken.trim();

    if (trimmedSectionTitleTextContentToken) {
      return trimmedSectionTitleTextContentToken;
    }
  }
};

exports.scrapeCourse = async (course) => {
  let courseTheoryCount = 0;
  let courseDemoCount = 0;
  let courseTheoryDurationSeconds = 0;
  let courseDemoDurationSeconds = 0;

  const courseSections = [];
  const courseLectures = {};

  const dom = await JSDOM.fromURL(course.url);
  const sectionDivs = Array.from(dom.window.document.querySelectorAll('.course-section'));

  sectionDivs.forEach((sectionDiv) => {
    let sectionTheoryCount = 0;
    let sectionDemoCount = 0;
    let sectionTheoryDurationSeconds = 0;
    let sectionDemoDurationSeconds = 0;

    const sectionLectures = [];
    const sectionTitle = extractSectionTitle(sectionDiv.querySelector('.section-title').textContent.trim());
    const sectionItemLis = sectionDiv.querySelectorAll('.section-item');

    sectionItemLis.forEach((sectionItemLi) => {
      let isVideoLecture = true;
      let isPracticeExamLecture = false;
      let isQuestionTechniqueLecture = false;
      let isQuizLecture = false;
      let isTheoryLecture = true;
      let lectureDurationSeconds = 0;

      const lectureTitleWithDuration = extractLectureTitleWithDuration(sectionItemLi.textContent.trim());
      const durationMatch = lectureTitleWithDuration.match(/(\d+):(\d+)/);

      if (durationMatch !== null) {
        lectureDurationSeconds = parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);

        if (lectureTitleWithDuration.search(/demo/iu) !== -1) {
          courseDemoCount++;
          sectionDemoCount++;

          courseDemoDurationSeconds += lectureDurationSeconds;
          sectionDemoDurationSeconds += lectureDurationSeconds;

          isTheoryLecture = false;
        } else {
          if (
            lectureTitleWithDuration.search(/exam question/iu) !== -1 ||
            lectureTitleWithDuration.search(/exam technique/iu) !== -1 ||
            lectureTitleWithDuration.search(/question technique/iu) !== -1
          ) {
            isQuestionTechniqueLecture = true;
          }

          courseTheoryCount++;
          sectionTheoryCount++;

          courseTheoryDurationSeconds += lectureDurationSeconds;
          sectionTheoryDurationSeconds += lectureDurationSeconds;
        }
      } else {
        courseTheoryCount++;
        sectionTheoryCount++;

        isVideoLecture = false;

        if (lectureTitleWithDuration.search(/practice exam/iu) !== -1) {
          isPracticeExamLecture = true;
        } else if (lectureTitleWithDuration.search(/quiz/iu) !== -1) {
          isQuizLecture = true;
        }
      }

      const lecture = {
        titleWithDuration: lectureTitleWithDuration,
        duration: lectureDurationSeconds,
        isVideo: isVideoLecture,
        isTheory: isTheoryLecture,
        isPracticeExam: isPracticeExamLecture,
        isQuestionTechnique: isQuestionTechniqueLecture,
        isQuiz: isQuizLecture,
        sharedWith: {},
        tags: Array.from(lectureTitleWithDuration.matchAll(/(\[.*?\])/g))
          .map((match) => {
            return match[0];
          })
          .sort()
      };

      sectionLectures.push(lecture);

      courseLectures[
        `${isTheoryLecture ? '[theory]' : '[demo]'}: ${lecture.titleWithDuration
          .replace(/\[.*?\]/gi, '')
          .replace(/\s+/gi, ' ')
          .replace(/^\s+-/, '')
          .replace(/\(\d+:\d+\)$/, '')
          .toLowerCase()
          .trim()}`
      ] = lecture;
    });

    courseSections.push({
      title: sectionTitle,
      count: {
        total: sectionTheoryCount + sectionDemoCount,
        theory: sectionTheoryCount,
        demo: sectionDemoCount
      },
      duration: {
        total: {
          seconds: sectionTheoryDurationSeconds + sectionDemoDurationSeconds,
          hhmmss: secondsToHHMMSS(sectionTheoryDurationSeconds + sectionDemoDurationSeconds)
        },
        theory: { seconds: sectionTheoryDurationSeconds, hhmmss: secondsToHHMMSS(sectionTheoryDurationSeconds) },
        demo: { seconds: sectionDemoDurationSeconds, hhmmss: secondsToHHMMSS(sectionDemoDurationSeconds) },
        sharedWith: {}
      },
      lectures: sectionLectures
    });
  });

  Object.assign(course, {
    count: {
      total: courseTheoryCount + courseDemoCount,
      theory: courseTheoryCount,
      demo: courseDemoCount
    },
    duration: {
      total: {
        seconds: courseTheoryDurationSeconds + courseDemoDurationSeconds,
        hhmmss: secondsToHHMMSS(courseTheoryDurationSeconds + courseDemoDurationSeconds)
      },
      theory: { seconds: courseTheoryDurationSeconds, hhmmss: secondsToHHMMSS(courseTheoryDurationSeconds) },
      demo: { seconds: courseDemoDurationSeconds, hhmmss: secondsToHHMMSS(courseDemoDurationSeconds) },
      sharedWith: {}
    },
    lectures: courseLectures,
    sections: courseSections
  });
};
