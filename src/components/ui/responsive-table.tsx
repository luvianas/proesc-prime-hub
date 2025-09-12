import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useBreakpoint } from "@/hooks/useBreakpoint";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ 
  children, 
  className = "" 
}) => {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <div className={`overflow-safe ${className}`}>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {children}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className={`overflow-safe ${className}`}>
      {children}
    </div>
  );
};

interface ResponsiveCardListProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  renderTable: () => React.ReactNode;
  className?: string;
}

export function ResponsiveCardList<T>({ 
  items, 
  renderCard, 
  renderTable, 
  className = "" 
}: ResponsiveCardListProps<T>) {
  const { isMobile } = useBreakpoint();

  if (isMobile && items.length > 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((item, index) => (
          <Card key={index} className="card-elegant">
            <CardContent className="spacing-mobile">
              {renderCard(item, index)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <ResponsiveTable className={className}>
      {renderTable()}
    </ResponsiveTable>
  );
}

export default ResponsiveTable;