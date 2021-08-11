const { JSDOM } = require('jsdom');

const extractLectureTitleWithDuration = (sectionItemTextContent) => {
  const nonEmptyTokens = [];

  for (const sectionItemTextContentToken of sectionItemTextContent.split('\n')) {
    const trimmedSectionItemTextContentToken = sectionItemTextContentToken.trim();

    if (trimmedSectionItemTextContentToken) {
      nonEmptyTokens.push(trimmedSectionItemTextContentToken);
    }
  }

  return nonEmptyTokens.slice(1).join(' ');
};

const extractSectionTitle = (sectionTitleTextContent) => {
  for (const sectionTitleTextContentToken of sectionTitleTextContent.split('\n')) {
    const trimmedSectionTitleTextContentToken = sectionTitleTextContentToken.trim();

    if (trimmedSectionTitleTextContentToken) {
      return trimmedSectionTitleTextContentToken;
    }
  }
};

const toHHMMSS = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, 0)}:${String(minutes).padStart(2, 0)}:${String(seconds).padStart(2, 0)}`;
};

exports.scrapeCourse = async (course) => {
  console.log(`Scraping ${course.title} @ ${course.url}`);

  let courseTheoryCount = 0;
  let courseDemoCount = 0;
  let courseTheoryDurationSeconds = 0;
  let courseDemoDurationSeconds = 0;

  const sections = [];

  const dom = await JSDOM.fromURL(course.url);
  const sectionDivs = Array.from(dom.window.document.querySelectorAll('.course-section'));

  sectionDivs.forEach((sectionDiv) => {
    let sectionTheoryCount = 0;
    let sectionDemoCount = 0;
    let sectionTheoryDurationSeconds = 0;
    let sectionDemoDurationSeconds = 0;

    const lectures = [];
    const sectionTitle = extractSectionTitle(sectionDiv.querySelector('.section-title').textContent.trim());
    const sectionItemLis = sectionDiv.querySelectorAll('.section-item');

    sectionItemLis.forEach((sectionItemLi) => {
      let isVideoLecture = true;

      const lectureTitleWithDuration = extractLectureTitleWithDuration(sectionItemLi.textContent.trim());
      const durationMatch = lectureTitleWithDuration.match(/(\d+):(\d+)/);

      if (durationMatch !== null) {
        const lectureDurationSeconds = parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);

        if (lectureTitleWithDuration.search(/demo/iu) !== -1) {
          courseDemoCount++;
          sectionDemoCount++;

          courseDemoDurationSeconds += lectureDurationSeconds;
          sectionDemoDurationSeconds += lectureDurationSeconds;
        } else {
          courseTheoryCount++;
          sectionTheoryCount++;

          courseTheoryDurationSeconds += lectureDurationSeconds;
          sectionTheoryDurationSeconds += lectureDurationSeconds;
        }
      } else {
        courseTheoryCount++;
        sectionTheoryCount++;

        isVideoLecture = false;
      }

      lectures.push({ isVideo: isVideoLecture, titleWithDuration: lectureTitleWithDuration });
    });

    sections.push({
      title: sectionTitle,
      count: {
        total: sectionTheoryCount + sectionDemoCount,
        theory: sectionTheoryCount,
        demo: sectionDemoCount
      },
      duration: {
        total: `${toHHMMSS(sectionTheoryDurationSeconds + sectionDemoDurationSeconds)}`,
        theory: `${toHHMMSS(sectionTheoryDurationSeconds)}`,
        demo: `${toHHMMSS(sectionDemoDurationSeconds)}`
      },
      lectures: lectures
    });
  });

  Object.assign(course, {
    count: {
      total: courseTheoryCount + courseDemoCount,
      theory: courseTheoryCount,
      demo: courseDemoCount
    },
    duration: {
      total: `${toHHMMSS(courseTheoryDurationSeconds + courseDemoDurationSeconds)}`,
      theory: `${toHHMMSS(courseTheoryDurationSeconds)}`,
      demo: `${toHHMMSS(courseDemoDurationSeconds)}`
    },
    sections: sections
  });

  console.log(`Scraped ${course.title} @ ${course.url}`);
};
