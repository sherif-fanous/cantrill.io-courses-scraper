const { Index } = require('flexsearch');

const DURATION_VARIANCE_PERCENTAGE = Number.parseFloat(process.env.DURATION_VARIANCE_PERCENTAGE);

const analyzeCourseSharedContent = (course, otherCourses) => {
  for (const otherCourse of otherCourses) {
    const otherCourseLectureTitles = Object.keys(otherCourse.lectures);

    const index = new Index('score');

    otherCourseLectureTitles.forEach((lectureTitle, i) => {
      index.add(i, lectureTitle);
    });

    for (const lectureTitle of Object.keys(course.lectures)) {
      if (
        !course.lectures[lectureTitle].isPracticeExam &&
        !course.lectures[lectureTitle].isQuestionTechnique &&
        !course.lectures[lectureTitle].isQuiz
      ) {
        /*
         * Mark any lecture with the SAAC02SHARED tag as shared with saa-c02
         */
        if (course.lectures[lectureTitle].titleWithDuration.match(/SAAC02SHARED/gi) !== null) {
          course.lectures[lectureTitle].sharedWith['saa-c02'] = true;
        }

        let lecture = null;
        let otherLecture = null;
        /*
         * First attempt an exact match. On failure attempt a fuzzy match
         */
        if (lectureTitle in otherCourse.lectures) {
          lecture = course.lectures[lectureTitle];
          otherLecture = otherCourse.lectures[lectureTitle];
        } else {
          const result = index.search(lectureTitle, 1);

          if (result.length === 1) {
            lecture = course.lectures[lectureTitle];
            otherLecture = otherCourse.lectures[otherCourseLectureTitles[result[0]]];
          }
        }

        if (lecture !== null && otherLecture !== null) {
          if (lecture.isVideo && otherLecture.isVideo) {
            const durationDeltaPercentage = (
              (Math.abs(lecture.duration - otherLecture.duration) / Math.min(lecture.duration, otherLecture.duration)) *
              100
            ).toFixed(2);

            if (durationDeltaPercentage < DURATION_VARIANCE_PERCENTAGE) {
              lecture.sharedWith[otherCourse.code] = true;
              otherLecture.sharedWith[course.code] = true;
            }
          } else if (!lecture.isVideo && !otherLecture.isVideo) {
            lecture.sharedWith[otherCourse.code] = true;
            otherLecture.sharedWith[course.code] = true;
          }
        }
      }
    }
  }
};

exports.analyzeCourses = (courses) => {
  const flattenedCourses = Object.values(courses).flat();

  for (let i = 0; i < flattenedCourses.length; i++) {
    analyzeCourseSharedContent(flattenedCourses[i], flattenedCourses.slice(i + 1));
  }
};
