const FuzzySet = require('fuzzyset');

const { getS3Object } = require('../lib/s3');

const DEBUG = process.env.DEBUG || false;
const DURATION_VARIANCE_PERCENTAGE = Number.parseFloat(process.env.DURATION_VARIANCE_PERCENTAGE);
const FORCED_MATCHES = process.env.FORCED_MATCHES;
const FUZZY_SET_INVALID_MATCHES = process.env.FUZZY_SET_INVALID_MATCHES;
const FUZZY_SET_MINIMUM_SCORE_MATCH = Number.parseFloat(process.env.FUZZY_SET_MINIMUM_SCORE_MATCH);
const SKIPPED_MATCHES = process.env.SKIPPED_MATCHES;

const analyzeCourseSharedContent = (course, otherCourses, configuration) => {
  for (const otherCourse of otherCourses) {
    const fuzzyset = FuzzySet(Object.keys(otherCourse.lectures), false);

    for (const lectureTitle of Object.keys(course.lectures)) {
      if (configuration.skippedMatches.includes(course.lectures[lectureTitle].titleWithDuration)) {
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

              validFuzzyMatchFound = isValidMatch(lecture, otherLecture, configuration);

              if (validFuzzyMatchFound) {
                break;
              }
            }
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

        if (!(otherCourse.code in course.lectures[lectureTitle].sharedWith)) {
          if (course.lectures[lectureTitle].titleWithDuration.toLowerCase() in configuration.forcedMatches) {
            for (const otherLectureTitle of Object.keys(otherCourse.lectures)) {
              if (
                configuration.forcedMatches[course.lectures[lectureTitle].titleWithDuration.toLowerCase()].includes(
                  otherCourse.lectures[otherLectureTitle].titleWithDuration.toLowerCase()
                )
              ) {
                lecture = course.lectures[lectureTitle];
                otherLecture = otherCourse.lectures[otherLectureTitle];

                lecture.sharedWith[otherCourse.code] = otherLecture.titleWithDuration;
                otherLecture.sharedWith[course.code] = lecture.titleWithDuration;

                console.log(
                  `Forced Match\n${course.code} => ${lecture.titleWithDuration}\n${otherCourse.code} => ${
                    otherLecture.titleWithDuration
                  }\n${'='.repeat(80)}`
                );

                break;
              }
            }
          }
        }
      }
    }
  }
};

const initializeConfiguration = async () => {
  const forcedMatches = JSON.parse(await getS3Object(FORCED_MATCHES));

  for (const titleWithDuration of Object.keys(forcedMatches)) {
    forcedMatches[titleWithDuration.toLowerCase()] = forcedMatches[titleWithDuration].map(
      (forcedMatchingTitleWithDuration) => {
        return forcedMatchingTitleWithDuration.toLowerCase();
      }
    );
    delete forcedMatches[titleWithDuration];
  }

  for (const [titleWithDuration, forcedMatchingTitlesWtihDuration] of Object.entries(forcedMatches)) {
    for (const forcedMatchingTitleWtihDuration of forcedMatchingTitlesWtihDuration) {
      const lowerCaseForcedMatchingTitleWtihDuration = forcedMatchingTitleWtihDuration.toLowerCase();

      if (lowerCaseForcedMatchingTitleWtihDuration in forcedMatches) {
        forcedMatches[lowerCaseForcedMatchingTitleWtihDuration].push(titleWithDuration);
      } else {
        forcedMatches[lowerCaseForcedMatchingTitleWtihDuration] = [titleWithDuration];
      }
    }
  }

  return {
    forcedMatches: forcedMatches,
    fuzzySetInvalidMatches: JSON.parse(await getS3Object(FUZZY_SET_INVALID_MATCHES)),
    skippedMatches: JSON.parse(await getS3Object(SKIPPED_MATCHES))
  };
};

const isValidMatch = (lecture, otherLecture, configuration) => {
  if (
    (lecture.titleWithDuration in configuration.fuzzySetInvalidMatches &&
      configuration.fuzzySetInvalidMatches[lecture.titleWithDuration].includes(otherLecture.titleWithDuration)) ||
    (otherLecture.titleWithDuration in configuration.fuzzySetInvalidMatches &&
      configuration.fuzzySetInvalidMatches[otherLecture.titleWithDuration].includes(lecture.titleWithDuration))
  ) {
    return false;
  }

  return true;
};

exports.analyzeCourses = async (courses) => {
  const configuration = await initializeConfiguration();

  const flattenedCourses = Object.values(courses).flat();

  for (let i = 0; i < flattenedCourses.length; i++) {
    analyzeCourseSharedContent(flattenedCourses[i], flattenedCourses.slice(i + 1), configuration);
  }
};
