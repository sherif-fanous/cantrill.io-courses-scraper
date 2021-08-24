const { Index } = require('flexsearch');

const analyzeCourseSharedContent = (course, otherCourses) => {
  for (const otherCourse of otherCourses) {
    const otherCourseLectureTitles = Object.keys(otherCourse.lectures);

    const index = new Index('performance');

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

        /*
         * First attempt an exact match. On failure attempt a fuzzy match
         */
        if (lectureTitle in otherCourse.lectures) {
          course.lectures[lectureTitle].sharedWith[otherCourse.code] = true;
          otherCourse.lectures[lectureTitle].sharedWith[course.code] = true;
        } else {
          const result = index.search(lectureTitle, 1);

          if (result.length === 1) {
            const lecture = course.lectures[lectureTitle];
            const otherLecture = otherCourse.lectures[otherCourseLectureTitles[result[0]]];

            if (lecture.isVideo && otherLecture.isVideo) {
              const durationDeltaPercentage = (
                (Math.abs(
                  course.lectures[lectureTitle].duration -
                    otherCourse.lectures[otherCourseLectureTitles[result[0]]].duration
                ) /
                  Math.min(
                    course.lectures[lectureTitle].duration,
                    otherCourse.lectures[otherCourseLectureTitles[result[0]]].duration
                  )) *
                100
              ).toFixed(2);

              if (durationDeltaPercentage < 10.0) {
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
  }
};

exports.analyzeCourses = (courses) => {
  const flattenedCourses = Object.values(courses).flat();

  for (let i = 0; i < flattenedCourses.length; i++) {
    analyzeCourseSharedContent(flattenedCourses[i], flattenedCourses.slice(i + 1));
  }
};
