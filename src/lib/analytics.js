const FuzzySet = require('fuzzyset');

const DEBUG = process.env.DEBUG || false;
const DURATION_VARIANCE_PERCENTAGE = Number.parseFloat(process.env.DURATION_VARIANCE_PERCENTAGE);
const FUZZY_SET_INVALID_MATCHES = JSON.parse(process.env.FUZZY_SET_INVALID_MATCHES);
const FUZZY_SET_MINIMUM_SCORE_MATCH = Number.parseFloat(process.env.FUZZY_SET_MINIMUM_SCORE_MATCH);
const LECTURES_SKIP_LIST = JSON.parse(process.env.LECTURES_SKIP_LIST);

const analyzeCourseSharedContent = (course, otherCourses) => {
  for (const otherCourse of otherCourses) {
    const fuzzyset = FuzzySet(Object.keys(otherCourse.lectures), false);

    for (const lectureTitle of Object.keys(course.lectures)) {
      if (LECTURES_SKIP_LIST.includes(course.lectures[lectureTitle].titleWithDuration)) {
        continue;
      }

      if (
        !course.lectures[lectureTitle].isPracticeExam &&
        !course.lectures[lectureTitle].isQuestionTechnique &&
        !course.lectures[lectureTitle].isQuiz
      ) {
        let results = null;
        let result = null;
        let lecture = null;
        let otherLecture = null;

        /*
         * First attempt an exact match. On failure attempt a fuzzy match
         */
        if (lectureTitle in otherCourse.lectures) {
          lecture = course.lectures[lectureTitle];
          otherLecture = otherCourse.lectures[lectureTitle];
        } else {
          let validFuzzyMatchFound = false;

          results = fuzzyset.get(lectureTitle, null, FUZZY_SET_MINIMUM_SCORE_MATCH);

          if (results !== null) {
            for (result of results) {
              lecture = course.lectures[lectureTitle];
              otherLecture = otherCourse.lectures[result[1]];

              validFuzzyMatchFound = isValidMatch(lecture, otherLecture);

              if (validFuzzyMatchFound) {
                break;
              }
            }
          }

          if (!validFuzzyMatchFound) {
            continue;
          }
        }

        if (lecture !== null && otherLecture !== null) {
          if (lecture.isVideo && otherLecture.isVideo) {
            const durationDeltaPercentage = (
              (Math.abs(lecture.duration - otherLecture.duration) / Math.min(lecture.duration, otherLecture.duration)) *
              100
            ).toFixed(2);

            if (durationDeltaPercentage <= DURATION_VARIANCE_PERCENTAGE) {
              lecture.sharedWith[otherCourse.code] = otherLecture.titleWithDuration;
              otherLecture.sharedWith[course.code] = lecture.titleWithDuration;

              if (DEBUG) {
                if (results !== null) {
                  console.log(
                    `Match\n${course.code} => ${lecture.titleWithDuration}\n${otherCourse.code} => ${
                      otherLecture.titleWithDuration
                    }\nScore => ${results[0][0] * 100}%\n${'='.repeat(80)}`
                  );
                }
              }
            } else {
              if (DEBUG) {
                if (results !== null) {
                  console.log(
                    `Skip\n${course.code} => ${lecture.titleWithDuration}\n${otherCourse.code} => ${
                      otherLecture.titleWithDuration
                    }\nScore => ${results[0][0] * 100}%\n${'='.repeat(80)}`
                  );
                }
              }
            }
          } else if (!lecture.isVideo && !otherLecture.isVideo) {
            lecture.sharedWith[otherCourse.code] = otherLecture.titleWithDuration;
            otherLecture.sharedWith[course.code] = lecture.titleWithDuration;
          }
        }
      }
    }
  }
};

const isValidMatch = (lecture, otherLecture) => {
  if (
    (lecture.titleWithDuration in FUZZY_SET_INVALID_MATCHES &&
      FUZZY_SET_INVALID_MATCHES[lecture.titleWithDuration].includes(otherLecture.titleWithDuration)) ||
    (otherLecture.titleWithDuration in FUZZY_SET_INVALID_MATCHES &&
      FUZZY_SET_INVALID_MATCHES[otherLecture.titleWithDuration].includes(lecture.titleWithDuration))
  ) {
    return false;
  }

  return true;
};

exports.analyzeCourses = (courses) => {
  const flattenedCourses = Object.values(courses).flat();

  for (let i = 0; i < flattenedCourses.length; i++) {
    analyzeCourseSharedContent(flattenedCourses[i], flattenedCourses.slice(i + 1));
  }
};
