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

  let courseTheoryDurationSeconds = 0;
  let courseDemoDurationSeconds = 0;

  const dom = await JSDOM.fromURL(course.url);
  const sections = Array.from(dom.window.document.querySelectorAll('.course-section'));

  sections.forEach((section) => {
    let sectionTheoryDurationSeconds = 0;
    let sectionDemoDurationSeconds = 0;

    const lectures = [];
    const sectionTitle = extractSectionTitle(section.querySelector('.section-title').textContent.trim());
    const sectionItems = section.querySelectorAll('.section-item');

    sectionItems.forEach((sectionItem) => {
      let isVideoLecture = true;

      const lectureTitleWithDuration = extractLectureTitleWithDuration(sectionItem.textContent.trim());
      const durationMatch = lectureTitleWithDuration.match(/(\d+):(\d+)/);

      if (durationMatch !== null) {
        const lectureDurationSeconds = parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);

        if (lectureTitleWithDuration.search(/demo/iu) !== -1) {
          courseDemoDurationSeconds += lectureDurationSeconds;
          sectionDemoDurationSeconds += lectureDurationSeconds;
        } else {
          courseTheoryDurationSeconds += lectureDurationSeconds;
          sectionTheoryDurationSeconds += lectureDurationSeconds;
        }
      } else {
        isVideoLecture = false;
      }

      lectures.push({ isVideo: isVideoLecture, titleWithDuration: lectureTitleWithDuration });
    });

    course.sections.push({
      title: sectionTitle,
      duration: {
        total: `${toHHMMSS(sectionTheoryDurationSeconds + sectionDemoDurationSeconds)}`,
        theory: `${toHHMMSS(sectionTheoryDurationSeconds)}`,
        demo: `${toHHMMSS(sectionDemoDurationSeconds)}`
      },
      lectures: lectures
    });
  });

  course.duration.total = `${toHHMMSS(courseTheoryDurationSeconds + courseDemoDurationSeconds)}`;
  course.duration.theory = `${toHHMMSS(courseTheoryDurationSeconds)}`;
  course.duration.demo = `${toHHMMSS(courseDemoDurationSeconds)}`;

  console.log(`Scraped ${course.title} @ ${course.url}`);
};
