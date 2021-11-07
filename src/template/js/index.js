const courses = _.chain(JSON.parse(`<%~ JSON.stringify(Object.values(it.courses).flat(), null, 2) %>`))
  .keyBy('code')
  .value();

const calculateChartHeight = () => {
  const viewPortHeight = $(window).height();

  const generateChartButton = $('#generateChartButton');
  const availableHeight = Math.trunc(
    viewPortHeight - (generateChartButton.offset().top + generateChartButton.outerHeight(true) + 8 + 16)
  );

  return availableHeight;
};

const calculateChartWidth = () => {
  const viewPortWidth = $(window).width();

  const availableWidth = Math.trunc(viewPortWidth - 32 - 32);

  return availableWidth;
};

const calculateContentDivsMaxHeight = () => {
  const viewPortHeight = $(window).height();

  const navigationBarDiv = $('#navigationBarDiv');
  const navigationBarDivHeight =
    navigationBarDiv.position().top + navigationBarDiv.offset().top + navigationBarDiv.outerHeight(true);

  const contentDivMaximumHeight = viewPortHeight - navigationBarDivHeight - 32;

  $('.content-div').css({ height: `${contentDivMaximumHeight}px`, maxHeight: `${contentDivMaximumHeight}px` });

  if (!$('#generateChartButton').hasClass('w3-disabled')) {
    drawChart();
  }
};

const determineGenerateChartButtonState = () => {
  const sourceCoursesCodes = $('#chartSourceCourses').val();
  const targetCourseCode = $('#chartTargetCourse').val();
  const scope = $('#chartScope').val();

  if (
    sourceCoursesCodes.length !== 0 &&
    targetCourseCode !== null &&
    scope !== null &&
    _.intersection(sourceCoursesCodes, [targetCourseCode]).length === 0
  ) {
    $('#generateChartButton').removeClass('w3-disabled');
    $('#generateChartButton').on('click', drawChart);
  } else {
    $('#generateChartButton').addClass('w3-disabled');
    $('#generateChartButton').off('click');
  }
};

const drawChart = () => {
  const options = {
    chart: {
      height: null,
      width: null
    },
    colors: ['#ff9900', '#000000', '#804d00'],
    credits: {
      enabled: false
    },
    series: [
      {
        type: 'venn',
        data: generateVennDiagramData(),
        dataLabels: {
          style: {
            color: '#808080',
            fontFamily: 'sans-serif',
            fontSize: '12',
            fontWeight: 'bold'
          },
          useHTML: true
        },
        tooltip: {
          headerFormat: '',
          pointFormat:
            '<span style="color:{point.color}; font-size: 18px">●</span><span style="font-family: sans-serif; font-size: 18px"> {point.custom.tooltip.title}</span><br /><br />{point.custom.tooltip.description}'
        }
      }
    ],
    title: {
      text: ''
    }
  };

  const chartHeight = calculateChartHeight();
  const chartWidth = calculateChartWidth();

  if (chartHeight > chartWidth) {
    options.chart.width = chartWidth;
    options.chart.height = chartWidth;
  } else if (chartHeight >= 400) {
    options.chart.height = chartHeight;
  } else {
    if (chartWidth > 400) {
      options.chart.height = 400;
    } else {
      options.chart.width = chartWidth;
      options.chart.height = chartWidth;
    }
  }

  const chartDiv = $('#chart');

  chartDiv.html('');
  chartDiv.show();

  Highcharts.chart('chart', options);
};

const generateVennDiagramData = () => {
  const sourceCoursesCodes = $('#chartSourceCourses').val();
  const targetCourseCode = $('#chartTargetCourse').val();
  const scope = $('#chartScope').val();

  const processedSourceCoursesCodes = [];
  const sourceLectures = {};

  sourceCoursesCodes.forEach((sourceCourseCode) => {
    sourceLectures[sourceCourseCode] = [];

    Object.keys(courses[sourceCourseCode].lectures).forEach((sourceLectureTitle) => {
      if (
        _.intersection(
          Object.keys(courses[sourceCourseCode].lectures[sourceLectureTitle].sharedWith),
          processedSourceCoursesCodes
        ).length === 0
      ) {
        sourceLectures[sourceCourseCode].push(courses[sourceCourseCode].lectures[sourceLectureTitle]);
      }
    });

    processedSourceCoursesCodes.push(sourceCourseCode);
  });

  const vennDiagramData = [];

  /*
   * Generate Venn diagram data for source courses
   */
  vennDiagramData.push(
    (() => {
      const sourceCoursesDuration = {
        total: { seconds: 0, hhmmss: '' },
        theory: { seconds: 0, hhmmss: '' },
        demo: { seconds: 0, hhmmss: '' }
      };

      Object.values(sourceLectures)
        .flat()
        .forEach((sourceLecture) => {
          sourceCoursesDuration.total.seconds += sourceLecture.duration;

          if (sourceLecture.isTheory) {
            sourceCoursesDuration.theory.seconds += sourceLecture.duration;
          } else {
            sourceCoursesDuration.demo.seconds += sourceLecture.duration;
          }
        });

      sourceCoursesDuration.total.hhmmss = secondsToHHMMSS(sourceCoursesDuration.total.seconds);
      sourceCoursesDuration.theory.hhmmss = secondsToHHMMSS(sourceCoursesDuration.theory.seconds);
      sourceCoursesDuration.demo.hhmmss = secondsToHHMMSS(sourceCoursesDuration.demo.seconds);

      return {
        custom: {
          tooltip: {
            title: sourceCoursesCodes
              .map((sourceCourseCode) => {
                return courses[sourceCourseCode].title;
              })
              .join(' + '),
            description: `Duration: ${sourceCoursesDuration[scope].hhmmss}`
          }
        },
        name: `${sourceCoursesCodes.join(' + ').toUpperCase()}<br />${sourceCoursesDuration[scope].hhmmss}`,
        sets: [sourceCoursesCodes.join('_')],
        value: sourceCoursesDuration[scope].seconds
      };
    })()
  );

  /*
   * Generate Venn diagram data for target course
   */
  vennDiagramData.push(
    (() => {
      return {
        custom: {
          tooltip: {
            title: courses[targetCourseCode].title,
            description: `Duration: ${courses[targetCourseCode].duration[scope].hhmmss}`
          }
        },
        name: `${courses[targetCourseCode].code.toUpperCase()}<br />${
          courses[targetCourseCode].duration[scope].hhmmss
        }`,
        sets: [targetCourseCode],
        value: courses[targetCourseCode].duration[scope].seconds
      };
    })()
  );

  /*
   * Generate Venn diagram data for intersection between source courses and target course
   */
  vennDiagramData.push(
    (() => {
      const intersectionLectures = [];

      Object.keys(sourceLectures).forEach((sourceCourseCode) => {
        sourceLectures[sourceCourseCode].forEach((sourceLecture) => {
          if (targetCourseCode in sourceLecture.sharedWith && sourceLecture.sharedWith[targetCourseCode]) {
            intersectionLectures.push(sourceLecture);
          }
        });
      });

      const intersectionLectureDuration = {
        total: { seconds: 0, hhmmss: '' },
        theory: { seconds: 0, hhmmss: '' },
        demo: { seconds: 0, hhmmss: '' }
      };

      intersectionLectures.forEach((intersectionLecture) => {
        intersectionLectureDuration.total.seconds += intersectionLecture.duration;

        if (intersectionLecture.isTheory) {
          intersectionLectureDuration.theory.seconds += intersectionLecture.duration;
        } else {
          intersectionLectureDuration.demo.seconds += intersectionLecture.duration;
        }
      });

      intersectionLectureDuration.total.hhmmss = secondsToHHMMSS(intersectionLectureDuration.total.seconds);
      intersectionLectureDuration.theory.hhmmss = secondsToHHMMSS(intersectionLectureDuration.theory.seconds);
      intersectionLectureDuration.demo.hhmmss = secondsToHHMMSS(intersectionLectureDuration.demo.seconds);

      return {
        custom: {
          tooltip: {
            title: `${
              sourceCoursesCodes.length > 1
                ? `(${sourceCoursesCodes.join(' \u222A ').toUpperCase()})`
                : `${sourceCoursesCodes[0].toUpperCase()}`
            } \u2229 ${targetCourseCode.toUpperCase()}`,
            description: `Shared content duration: ${
              intersectionLectureDuration[scope].hhmmss
            }<br />Shared content represents ${(
              (intersectionLectureDuration[scope].seconds / courses[targetCourseCode].duration[scope].seconds) *
              100
            ).toFixed(2)}% of ${targetCourseCode.toUpperCase()}<br /><br />New content duration: ${secondsToHHMMSS(
              courses[targetCourseCode].duration[scope].seconds - intersectionLectureDuration[scope].seconds
            )}<br />New content represents ${(
              100 -
              (intersectionLectureDuration[scope].seconds / courses[targetCourseCode].duration[scope].seconds) * 100
            ).toFixed(2)}% of ${targetCourseCode.toUpperCase()}`
          }
        },
        name: `${intersectionLectureDuration[scope].hhmmss}`,
        sets: [sourceCoursesCodes.join('_'), targetCourseCode],
        value: intersectionLectureDuration[scope].seconds
      };
    })()
  );

  return vennDiagramData;
};

const openCertificationLevelDiv = (certificationTabDivID, certificationDivID) => {
  const borderColors = {
    associateTab: '#2c77ea !important',
    professionalTab: '#3dcac0 !important',
    specialtyTab: '#4d27aa !important'
  };

  $('.certification-div').hide();
  $('.certification-tab-div').removeAttr('style');
  $(`#${certificationDivID}`).show();
  $(`#${certificationTabDivID}`).attr('style', `border-color: ${borderColors[certificationTabDivID]}`);
};

const openContentDiv = (navigationButtonID, contentDivID) => {
  $('.content-div').hide();
  $('.navigation-button').attr('style', 'color: #ffffff !important');
  $(`#${contentDivID}`).show();
  $(`#${navigationButtonID}`).attr('style', 'color: #ffffff !important; background-color: #ff9900 !important');
};

const secondsToHHMMSS = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, 0)}:${String(minutes).padStart(2, 0)}:${String(seconds).padStart(2, 0)}`;
};

const toggleAccordian = (courseDivID) => {
  $(`#${courseDivID}`).toggle();
};

$(function () {
  $(window).on('resize', calculateContentDivsMaxHeight);

  calculateContentDivsMaxHeight();
});
