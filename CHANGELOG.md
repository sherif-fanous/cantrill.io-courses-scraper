# Changelog

## 2.4.0 2022-01-09

- Replaced flexsearch with fuzzyset.js
- **Feature** Added "FUZZY_SET_MINIMUM_SCORE_MATCH" environment variable to specify the minimum score required when trying to match lectures
- **Feature** Added "FUZZY_SET_INVALID_MATCHES" environment variable to override some invalid lecture matches
- **Feature** Added "LECTURES_SKIP_LIST" environment variable to specify lectures that should not be matched
- **Feature** Updated the tooltip text of the mini icons to include the name of the matched lecture

## 2.3.0 2021-11-07

- **Bug Fix** Improved logic used to determine shared lectures
- **Feature** Added AWS Certified DevOps Engineer course

## 2.2.0 2021-10-03

- **Bug Fix** Added lecture duration comparison even in case the lecture titles are identical
- **Bug Fix** Improved logic used to generate the intersection in the chart
- **Feature** Added "DURATION_VARIANCE_PERCENTAGE" environment variable to easily configure the allowed duration variance when trying to match lectures

## 2.1.0 2021-08-25

- **Feature** Add more details to the tooltip description of the intersection area

## 2.0.0 2021-08-24

- **Feature** UI/UX redesign
- **Feature** Added mini icons next to lectures to signify that the lecture is shared with other courses
- **Feature** Added charts functionality
- Code cleanup and refactoring

## 1.1.1 2021-08-11

- Improved HTML layout

## 1.1.0 2021-08-11

- **Feature** Added lectures count to courses and sections
- Code cleanup and refactoring

## 1.0.0

- Initial release
