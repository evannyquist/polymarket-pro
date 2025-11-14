"use client";

import { useEffect, useState } from "react";

/**
 * Parses the end time from a Bitcoin Up or Down market question string.
 * Format: "Bitcoin Up or Down - November 13, 9:00AM-9:15AM ET"
 * Returns the end time as a Date object, or null if parsing fails.
 */
function parseEndTimeFromQuestion(question: string): Date | null {
  try {
    // Match pattern: "Bitcoin Up or Down - [Date], [Start]-[End] ET"
    // Example: "Bitcoin Up or Down - November 13, 9:00AM-9:15AM ET"
    const match = question.match(/(\w+\s+\d+),\s+[\d:]+(AM|PM)-([\d:]+(AM|PM))\s+ET/i);
    
    if (!match) {
      return null;
    }

    const datePart = match[1]; // e.g., "November 13"
    const endTimePart = match[3]; // e.g., "9:15AM"
    const endTimePeriod = match[4]; // e.g., "AM" or "PM"

    // Parse the date part (e.g., "November 13")
    const dateMatch = datePart.match(/(\w+)\s+(\d+)/);
    if (!dateMatch) {
      return null;
    }

    const monthName = dateMatch[1]; // e.g., "November"
    const day = parseInt(dateMatch[2], 10); // e.g., 13

    // Map month names to numbers
    const monthMap: { [key: string]: number } = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };

    const month = monthMap[monthName.toLowerCase()];
    if (month === undefined) {
      return null;
    }

    // Parse the end time (e.g., "9:15AM")
    const timeMatch = endTimePart.match(/(\d+):(\d+)(AM|PM)/i);
    if (!timeMatch) {
      return null;
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3].toUpperCase();

    // Convert to 24-hour format
    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    // Get current year
    const currentYear = new Date().getFullYear();

    // Check if DST applies on this date
    // DST in US: Second Sunday in March to First Sunday in November
    const isDSTDate = (year: number, month: number, day: number): boolean => {
      if (month < 2 || month > 10) return false; // Dec, Jan, Feb are EST
      if (month > 2 && month < 10) return true; // Apr-Oct are EDT
      
      // March: check if after 2nd Sunday
      if (month === 2) {
        const firstDay = new Date(year, 2, 1);
        const firstSunday = 7 - firstDay.getDay(); // Day of month for first Sunday
        const secondSunday = firstSunday + 7;
        return day >= secondSunday;
      }
      
      // November: check if before 1st Sunday
      if (month === 10) {
        const firstDay = new Date(year, 10, 1);
        const firstSunday = 7 - firstDay.getDay();
        return day < firstSunday;
      }
      
      return false;
    };
    
    const isDST = isDSTDate(currentYear, month, day);
    const etOffset = isDST ? -4 : -5; // EDT is UTC-4, EST is UTC-5
    
    // Create date string in ISO format
    const etDateString = `${currentYear}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    
    // Create date with ET timezone offset
    // Format: "YYYY-MM-DDTHH:MM:SS-HH:MM" where -HH:MM is the offset
    const offsetStr = etOffset < 0 ? `-${String(Math.abs(etOffset)).padStart(2, "0")}:00` : `+${String(etOffset).padStart(2, "0")}:00`;
    return new Date(`${etDateString}${offsetStr}`);
  } catch (error) {
    console.error("Error parsing end time from question:", error);
    return null;
  }
}

/**
 * Formats time remaining as "HH:MM:SS" or "MM:SS" if less than an hour
 */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
}

interface CountdownTimerProps {
  marketQuestion?: string;
}

export default function CountdownTimer({ marketQuestion }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!marketQuestion) {
      setTimeRemaining(null);
      return;
    }

    const endTime = parseEndTimeFromQuestion(marketQuestion);
    if (!endTime) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const remaining = endTime.getTime() - now.getTime();
      
      if (remaining <= 0) {
        setTimeRemaining("00:00");
      } else {
        setTimeRemaining(formatTimeRemaining(remaining));
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [marketQuestion]);

  if (!timeRemaining) {
    return null;
  }

  return (
    <div className="flex flex-col items-end">
      <span className="text-xs text-gray-400 mb-0.5">time remaining</span>
      <span className="text-xl font-bold text-red-500 leading-none tabular-nums">
        {timeRemaining}
      </span>
    </div>
  );
}

