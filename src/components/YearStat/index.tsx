import { lazy, Suspense } from 'react';
import Stat from '@/components/Stat';
import useActivities from '@/hooks/useActivities';
import type { Activity } from '@/utils/utils';
import { formatPace } from '@/utils/utils';
import useHover from '@/hooks/useHover';
import { yearStats, githubYearStats } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';
import { ACTIVITY_TOTAL, SHOW_ELEVATION_GAIN } from '@/utils/const';
import { DIST_UNIT, M_TO_DIST, M_TO_ELEV } from '@/utils/utils';

const yearSvgs = Object.fromEntries(
  Object.keys(yearStats).map((path) => [
    path,
    lazy(() => loadSvgComponent(yearStats, path)),
  ])
);

const githubYearSvgs = Object.fromEntries(
  Object.keys(githubYearStats).map((path) => [
    path,
    lazy(() => loadSvgComponent(githubYearStats, path)),
  ])
);

interface YearStatAccumulator {
  averageHeartRateTotal: number;
  heartRateNullCount: number;
  activityCount: number;
  streak: number;
  totalDistance: number;
  totalElevationGain: number;
  totalMetersForPace: number;
  totalSecondsForPace: number;
}

interface YearStatSummary {
  averageHeartRate: string;
  averagePace: string;
  activityCount: number;
  hasHeartRate: boolean;
  streak: number;
  totalDistance: number;
  totalElevationGain: string;
}

const createAccumulator = (): YearStatAccumulator => ({
  averageHeartRateTotal: 0,
  heartRateNullCount: 0,
  activityCount: 0,
  streak: 0,
  totalDistance: 0,
  totalElevationGain: 0,
  totalMetersForPace: 0,
  totalSecondsForPace: 0,
});

const addActivityToAccumulator = (
  accumulator: YearStatAccumulator,
  activity: Activity
) => {
  accumulator.activityCount += 1;
  accumulator.totalDistance += activity.distance || 0;
  accumulator.totalElevationGain += activity.elevation_gain || 0;

  if (activity.average_speed) {
    accumulator.totalMetersForPace += activity.distance || 0;
    accumulator.totalSecondsForPace +=
      (activity.distance || 0) / activity.average_speed;
  }

  if (activity.average_heartrate) {
    accumulator.averageHeartRateTotal += activity.average_heartrate;
  } else {
    accumulator.heartRateNullCount += 1;
  }

  if (activity.streak) {
    accumulator.streak = Math.max(accumulator.streak, activity.streak);
  }
};

const finalizeYearStat = (
  accumulator: YearStatAccumulator
): YearStatSummary => {
  const heartRateCount =
    accumulator.activityCount - accumulator.heartRateNullCount;

  return {
    averageHeartRate: (
      accumulator.averageHeartRateTotal / heartRateCount
    ).toFixed(0),
    averagePace: formatPace(
      accumulator.totalMetersForPace / accumulator.totalSecondsForPace
    ),
    hasHeartRate: accumulator.averageHeartRateTotal !== 0,
    activityCount: accumulator.activityCount,
    streak: accumulator.streak,
    totalDistance: parseFloat(
      (accumulator.totalDistance / M_TO_DIST).toFixed(1)
    ),
    totalElevationGain: (accumulator.totalElevationGain * M_TO_ELEV).toFixed(0),
  };
};

const yearStatCache = new WeakMap<Activity[], Map<string, YearStatSummary>>();

const getYearStatSummaries = (activityData: Activity[]) => {
  const cachedSummaries = yearStatCache.get(activityData);
  if (cachedSummaries) return cachedSummaries;

  const accumulators = new Map<string, YearStatAccumulator>();
  accumulators.set('Total', createAccumulator());

  activityData.forEach((activity) => {
    const year = activity.start_date_local.slice(0, 4);
    if (!accumulators.has(year)) {
      accumulators.set(year, createAccumulator());
    }
    addActivityToAccumulator(accumulators.get('Total')!, activity);
    addActivityToAccumulator(accumulators.get(year)!, activity);
  });

  const summaries = new Map(
    Array.from(accumulators, ([year, accumulator]) => [
      year,
      finalizeYearStat(accumulator),
    ])
  );
  yearStatCache.set(activityData, summaries);
  return summaries;
};

const YearStat = ({
  year,
  onClick,
}: {
  year: string;
  onClick: (_year: string) => void;
}) => {
  const { activities } = useActivities();
  // for hover
  const [hovered, eventHandlers] = useHover();
  // lazy Component
  const YearSVG = yearSvgs[`./year_${year}.svg`];
  const GithubYearSVG = githubYearSvgs[`./github_${year}.svg`];
  const summary = getYearStatSummaries(activities).get(year);

  if (!summary) return null;

  return (
    <div className="cursor-pointer" onClick={() => onClick(year)}>
      <section {...eventHandlers}>
        <Stat value={year} description=" Journey" />
        <Stat
          value={summary.activityCount}
          description={ACTIVITY_TOTAL.ACTIVITY_COUNT_UNIT_TITLE}
        />
        <Stat value={summary.totalDistance} description={` ${DIST_UNIT}`} />
        {SHOW_ELEVATION_GAIN && (
          <Stat
            value={summary.totalElevationGain}
            description=" Elevation Gain"
          />
        )}
        <Stat value={summary.averagePace} description=" Avg Pace" />
        <Stat value={`${summary.streak} day`} description=" Streak" />
        {summary.hasHeartRate && (
          <Stat
            value={summary.averageHeartRate}
            description=" Avg Heart Rate"
          />
        )}
      </section>
      {year !== 'Total' && hovered && YearSVG && GithubYearSVG && (
        <Suspense fallback="loading...">
          <YearSVG className="year-svg my-4 h-4/6 w-4/6 border-0 p-0" />
          <GithubYearSVG className="github-year-svg my-4 h-auto w-full border-0 p-0" />
        </Suspense>
      )}
      <hr />
    </div>
  );
};

export default YearStat;
