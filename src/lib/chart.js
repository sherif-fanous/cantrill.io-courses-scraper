const Combinatorics = require('js-combinatorics/commonjs/combinatorics.js');

exports.generateVennDiagramData = (courses, coursesSharedContent, vennDiagramData) => {
  const flattenedCourses = Object.values(courses).flat();
  const mappedCourses = {};

  flattenedCourses.forEach((course) => Object.assign(mappedCourses, { [course.code]: course }));

  for (const coursesSharedContentKey of Object.keys(coursesSharedContent)) {
    for (const coureDurationType of ['total', 'theory', 'demo']) {
      vennDiagramData[`${coureDurationType}_${coursesSharedContentKey}`] = [];
    }

    const involvedCourses = coursesSharedContentKey.split('_');

    const courseCombinations = [];

    for (let i = 1; i <= involvedCourses.length; i++) {
      courseCombinations.push(...new Combinatorics.Combination(involvedCourses, i));
    }

    for (const courseCombination of courseCombinations) {
      if (courseCombination.length === 1) {
        for (const course of flattenedCourses) {
          if (courseCombination[0] === course.code) {
            for (const coureDurationType of ['total', 'theory', 'demo']) {
              const vennDiagramDataKey = `${coureDurationType}_${coursesSharedContentKey}`;

              vennDiagramData[vennDiagramDataKey].push({
                x: course.code,
                value: course.duration[coureDurationType].seconds,
                name: `${course.code.toUpperCase()}\n${course.duration[coureDurationType].hhmmss}`,
                tooltipTitle: course.title,
                tooltipDesc: `Duration: ${course.duration[coureDurationType].hhmmss}`
              });
            }

            break;
          }
        }
      } else {
        const sharedContentKey = courseCombination.sort().join('_');
        const sharedContentValue = coursesSharedContent[sharedContentKey];

        for (const coureDurationType of ['total', 'theory', 'demo']) {
          const vennDiagramDataKey = `${coureDurationType}_${coursesSharedContentKey}`;

          vennDiagramData[vennDiagramDataKey].push({
            x: courseCombination,
            value: sharedContentValue[coureDurationType].seconds,
            name: `${sharedContentValue[coureDurationType].hhmmss}`,
            tooltipTitle: courseCombination.join(' \u2229 ').toUpperCase(),
            tooltipDesc: courseCombination
              .map((courseCode) => {
                return `${courseCode.toUpperCase()}: ${(
                  (sharedContentValue[coureDurationType].seconds /
                    mappedCourses[courseCode].duration[coureDurationType].seconds) *
                  100
                ).toFixed(2)}%`;
              })
              .join('\n')
          });
        }
      }
    }
  }
};
