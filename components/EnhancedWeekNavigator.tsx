import React, { useState } from 'react';

interface EnhancedWeekNavigatorProps {
  totalWeeks: number;
  currentWeek: number;
  onWeekChange: (week: number) => void;
  completedWeeksSet: Set<number>;
}

type ViewMode = 'list' | 'grid';

const quarters = [
  { title: "Weeks 1-13", start: 1, end: 13 },
  { title: "Weeks 14-26", start: 14, end: 26 },
  { title: "Weeks 27-39", start: 27, end: 39 },
  { title: "Weeks 40-52", start: 40, end: 52 },
];

const FilledCheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const ListView: React.FC<Omit<EnhancedWeekNavigatorProps, 'totalWeeks'>> = ({ currentWeek, onWeekChange, completedWeeksSet }) => (
  <div className="space-y-2">
    {quarters.map((quarter, index) => (
      <details key={quarter.title} open={currentWeek >= quarter.start && currentWeek <= quarter.end}>
        <summary className="cursor-pointer p-2 font-medium text-muted rounded-md hover:bg-card-secondary transition-colors">
          {quarter.title}
        </summary>
        <div className="grid grid-cols-2 gap-1 pl-4 pt-2">
          {Array.from({ length: quarter.end - quarter.start + 1 }, (_, i) => quarter.start + i).map(week => {
            const isCompleted = completedWeeksSet.has(week);
            const isCurrent = week === currentWeek;
            return (
              <button
                key={week}
                onClick={() => onWeekChange(week)}
                className={`w-full flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isCurrent
                    ? 'bg-primary text-on-primary font-semibold'
                    : 'text-muted hover:bg-primary-light'
                }`}
              >
                <span>Week {week}</span>
                {isCompleted && !isCurrent && (
                    <span className="ml-2" aria-label="Completed">
                        <FilledCheckCircleIcon />
                    </span>
                )}
              </button>
            )
          })}
        </div>
      </details>
    ))}
  </div>
);

const GridView: React.FC<Omit<EnhancedWeekNavigatorProps, 'themes'>> = ({ totalWeeks, currentWeek, onWeekChange, completedWeeksSet }) => (
    <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(week => {
            const isCompleted = completedWeeksSet.has(week);
            const isCurrent = week === currentWeek;
            
            let buttonClass = "flex items-center justify-center h-9 w-full rounded-md border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ring-primary ";

            if (isCurrent) {
                buttonClass += "bg-primary text-on-primary border-primary";
            } else if (isCompleted) {
                buttonClass += "bg-primary-light text-primary-on-light border-primary-light hover:bg-primary-light-hover";
            } else {
                buttonClass += "bg-card border-default hover:bg-card-secondary";
            }

            return (
                 <button key={week} onClick={() => onWeekChange(week)} className={buttonClass}>
                    <span>{week}</span>
                    {isCompleted && !isCurrent && (
                        <span className="ml-1" aria-label="Completed">
                            <FilledCheckCircleIcon />
                        </span>
                    )}
                 </button>
            );
        })}
    </div>
);


export const EnhancedWeekNavigator: React.FC<EnhancedWeekNavigatorProps> = (props) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  return (
    <div className="p-4 bg-card rounded-lg shadow-sm">
      <h3 className="text-sm font-medium text-muted mb-2">
        Navigate Journey
      </h3>
      <div className="mb-4">
        <div className="flex items-center p-1 bg-card-secondary rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`w-1/2 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted'}`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`w-1/2 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-muted'}`}
          >
            Grid View
          </button>
        </div>
      </div>
      
      {viewMode === 'list' ? <ListView {...props} /> : <GridView {...props} />}

    </div>
  );
};