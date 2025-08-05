import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DebugStaffAssignmentsProps {
  allStaff: any[];
  freelancers: any[];
  allCombinedPeople: any[];
  multiDayAssignments: any[];
  photographers: any[];
  cinematographers: any[];
}

export const DebugStaffAssignments = ({
  allStaff,
  freelancers,
  allCombinedPeople,
  multiDayAssignments,
  photographers,
  cinematographers
}: DebugStaffAssignmentsProps) => {
  
  const handleDebugLog = () => {
    console.log('=== STAFF ASSIGNMENT DEBUG ===');
    console.log('Raw staff:', allStaff);
    console.log('Raw freelancers:', freelancers);
    console.log('Combined people:', allCombinedPeople);
    console.log('Filtered photographers:', photographers);
    console.log('Filtered cinematographers:', cinematographers);
    console.log('Current assignments:', multiDayAssignments);
    
    // Check for any mismatches
    multiDayAssignments.forEach(day => {
      console.log(`Day ${day.day} assignment check:`);
      
      day.photographer_ids?.forEach((id: string) => {
        if (id && id.trim() !== '') {
          const found = allCombinedPeople.find(p => p.id === id);
          console.log(`  Photographer ${id}: ${found ? `✅ ${found.full_name}` : '❌ NOT FOUND'}`);
        }
      });
      
      day.cinematographer_ids?.forEach((id: string) => {
        if (id && id.trim() !== '') {
          const found = allCombinedPeople.find(p => p.id === id);
          console.log(`  Cinematographer ${id}: ${found ? `✅ ${found.full_name}` : '❌ NOT FOUND'}`);
        }
      });
    });
  };

  return (
    <Card className="mt-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-yellow-800">
          🔍 Debug Staff Assignment Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <Badge variant="outline">Staff: {allStaff.length}</Badge>
          </div>
          <div>
            <Badge variant="outline">Freelancers: {freelancers.length}</Badge>
          </div>
          <div>
            <Badge variant="outline">Combined: {allCombinedPeople.length}</Badge>
          </div>
          <div>
            <Badge variant="outline">Photographers: {photographers.length}</Badge>
          </div>
          <div>
            <Badge variant="outline">Cinematographers: {cinematographers.length}</Badge>
          </div>
          <div>
            <Badge variant="outline">Assignments: {multiDayAssignments.length}</Badge>
          </div>
        </div>
        
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleDebugLog}
          className="w-full text-xs"
        >
          📋 Log Debug Info to Console
        </Button>
        
        {multiDayAssignments.length > 0 && (
          <div className="text-xs text-yellow-700">
            <p className="font-medium">Current Assignments:</p>
            {multiDayAssignments.map(day => (
              <div key={day.day} className="ml-2">
                Day {day.day}: {day.photographer_ids?.filter((id: string) => id && id.trim() !== '').length || 0} photographers, {day.cinematographer_ids?.filter((id: string) => id && id.trim() !== '').length || 0} cinematographers
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};