import React from 'react';
import { Card, CardContent, Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot, Typography } from '@mui/lab';

/**
 * CaseTimeline
 * الوصف: عرض الجدول الزمني لأحداث الحالة
 */
function CaseTimeline({ caseData }) {
  const events = [
    { date: caseData.createdAt, title: 'تم إنشاء الحالة', color: 'primary' },
    { date: caseData.admissionInfo?.applicationDate, title: 'تقديم الطلب', color: 'info' },
    { date: caseData.admissionInfo?.admissionDate, title: 'قبول المستفيد', color: 'success' },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>📅 الجدول الزمني</Typography>
        <Timeline>
          {events.map((event, idx) => (
            <TimelineItem key={idx}>
              <TimelineSeparator>
                <TimelineDot color={event.color} />
                {idx < events.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Typography variant="body2">{event.title}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {event.date ? new Date(event.date).toLocaleDateString('ar-SA') : 'لم يحدد'}
                </Typography>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
}

export default CaseTimeline;
