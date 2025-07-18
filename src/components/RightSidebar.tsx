import React from 'react';

export const RightSidebar: React.FC = () => {
  return (
    <div className="w-48 sm:w-56 md:w-64 lg:w-80 xl:w-96 bg-gradient-panel border-l border-border flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-muted-foreground">
          Advertisement Space
        </h2>
      </div>
      
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">
            This space is reserved for advertisements
          </p>
        </div>
      </div>
    </div>
  );
};