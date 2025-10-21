import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "./ui/drawer";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { useProfileApi } from '@/services/profileApi';
import { useAuth } from "../contexts/AuthContext";
import { courseMetadata } from "../lib/courseMetadata";
import { Skeleton } from "./ui/skeleton";

interface CourseSuggestion {
  name: string;
  emoji?: string;
  fit: number; // 1 (best fit) to 3 (lowest fit)
  matched_traits?: string[];
  reason?: string;
}

interface CourseSuggestionsProps {
  suggestions?: CourseSuggestion[]; // Now optional, for controlled mode
}

const getPillColor = (fit: number) => {
  if (fit === 1) return "#88648d";
  if (fit === 2) return "#bba7be";
  return "#eee9ef";
};

// Simple hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

const ANIMATION_STAGGER = 50; // ms per pill, for a faster wave
const DEFAULT_TAG_WIDTH = 180; // px, estimated average tag width including gap

const CourseSuggestions: React.FC<CourseSuggestionsProps> = ({ suggestions: propSuggestions }) => {
  const [pulseIndex, setPulseIndex] = useState<number | null>(0);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CourseSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<CourseSuggestion[]>(propSuggestions || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [_tagsPerRow, setTagsPerRow] = useState(1);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { getCourseRecommendations } = useProfileApi();

  useEffect(() => {
    function updateTagsPerRow() {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setTagsPerRow(Math.max(1, Math.floor(width / DEFAULT_TAG_WIDTH)));
      }
    }
    updateTagsPerRow();
    window.addEventListener("resize", updateTagsPerRow);
    return () => window.removeEventListener("resize", updateTagsPerRow);
  }, []);

  useEffect(() => {
    if (!propSuggestions && user?.id) {
      setLoading(true);
      getCourseRecommendations(user.id)
        .then((res) => {
          // Map backend response to expected format
          const backendSuggestions = (res.recommendations || []).map((rec: any) => ({
            name: rec.course,
            fit: rec.course_fit,
            matched_traits: rec.matched_traits,
            reason: rec.reason,
          }));
          setSuggestions(backendSuggestions);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load recommendations");
          setLoading(false);
        });
    }
  }, [propSuggestions, user, getCourseRecommendations]);

  useEffect(() => {
    if (!loading && suggestions.length > 0) {
      setPulseIndex(0);
      setTimeout(() => setAnimateIn(true), 50);
    } else {
      setPulseIndex(null);
      setAnimateIn(false);
    }
  }, [loading, suggestions.length]);

  useEffect(() => {
    if (pulseIndex === 0) {
      const timer = setTimeout(() => setPulseIndex(1), 1200);
      return () => clearTimeout(timer);
    } else if (pulseIndex === 1) {
      const timer = setTimeout(() => setPulseIndex(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [pulseIndex]);

  const handleTagClick = (course: CourseSuggestion) => {
    setSelected(course);
    setOpen(true);
  };

  const DetailContent = selected && (
    <div>
      <div className="mb-4">
        <div className="font-medium mb-1">Matched Traits</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {(selected.matched_traits || []).map((trait) => (
            <span key={trait} className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm font-medium">
              {trait}
            </span>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <div className="font-medium mb-1">Why this fits you?</div>
        <div className="text-sm text-gray-700 mb-2">{selected.reason}</div>
      </div>
      <Button className="w-full mt-2">Explore programs in this course</Button>
    </div>
  );

  // Helper: split pills for mobile rows
  const getMobileRows = (pills: CourseSuggestion[]) => {
    const layout = [2, 3, 3, 2];
    const rows: CourseSuggestion[][] = [];
    let idx = 0;
    for (let n of layout) {
      if (idx >= pills.length) break;
      rows.push(pills.slice(idx, idx + n));
      idx += n;
    }
    return rows;
  };

  if (loading) {
    const skeletonWidths = [
      "w-24", "w-32", "w-40", "w-48", "w-56", "w-36", "w-28", "w-44", "w-52", "w-60"
    ];
    if (isMobile) {
      // Define widths for each pill in each row
      const rowWidths = [
        ["w-32", "w-44"],            // Row 1: medium, long
        ["w-24", "w-36", "w-48"],    // Row 2: short, medium, long
        ["w-36", "w-44", "w-28"],    // Row 3: medium, long, short
        ["w-48", "w-32"]             // Row 4: long, medium
      ];
      return (
        <div className="flex flex-col gap-3 py-2">
          {rowWidths.map((widths, rowIdx) => (
            <div
              key={rowIdx}
              className="flex gap-3 overflow-x-auto hide-scrollbar px-1"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {widths.map((w, i) => (
                <Skeleton
                  key={i}
                  className={`h-10 ${w} rounded-full whitespace-nowrap`}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }
    // Desktop fallback
    return (
      <div className="flex flex-wrap gap-3 py-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton
            key={i}
            className={`h-10 ${skeletonWidths[i % skeletonWidths.length]} rounded-full`}
          />
        ))}
      </div>
    );
  }
  if (error) return <div className="text-center text-red-500 py-8">{error}</div>;
  if (!suggestions.length) return <div className="text-center text-muted-foreground py-8">No course suggestions available.</div>;

  // --- MOBILE LAYOUT ---
  if (isMobile) {
    const rows = getMobileRows(suggestions);
    let globalIdx = 0;
    return (
      <>
        <div className="flex flex-col gap-3 py-2">
          {rows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="flex gap-3 overflow-x-auto hide-scrollbar px-1"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {row.map((course, i) => {
                const thisIdx = globalIdx++;
                return (
                  <span
                    key={course.name}
                    className={`px-4 py-2 rounded-full font-medium flex items-center shadow transition-transform duration-150 cursor-pointer fade-in-pill whitespace-nowrap h-10 ${pulseIndex === i ? 'smooth-pulse' : ''}`}
                    style={{
                      background: getPillColor(course.fit),
                      color: course.fit < 0.5 ? '#7c4a99' : 'white',
                      animationDelay: `${thisIdx * ANIMATION_STAGGER}ms`,
                      animationPlayState: animateIn ? 'running' : 'paused',
                    }}
                    onClick={() => handleTagClick(course)}
                  >
                    <span className="mr-2 text-lg">{courseMetadata[course.name]?.emoji || course.emoji || "📚"}</span>
                    {course.name}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        {isMobile ? (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent>
              <div className="flex justify-between items-center p-4 pb-2">
                <span className="font-semibold text-lg">{courseMetadata[selected?.name || ""]?.emoji || selected?.emoji || "📚"} {selected?.name}</span>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close">
                    <X className="h-5 w-5" />
                  </Button>
                </DrawerClose>
              </div>
              <div className="p-4 pt-0">
                {DetailContent}
              </div>
            </DrawerContent>
          </Drawer>
        ) : null}
      </>
    );
  }

  // --- DESKTOP LAYOUT (unchanged) ---
  return (
    <>
      <div className="flex flex-wrap gap-3" ref={containerRef}>
        {suggestions.map((course, i) => (
          <span
            key={course.name}
            className={`px-4 py-2 rounded-full font-medium flex items-center shadow transition-transform duration-150 cursor-pointer fade-in-pill ${pulseIndex === i ? 'smooth-pulse' : ''}`}
            style={{
              background: getPillColor(course.fit),
              color: course.fit < 0.5 ? '#7c4a99' : 'white',
              animationDelay: `${i * ANIMATION_STAGGER}ms`,
              animationPlayState: animateIn ? 'running' : 'paused',
            }}
            onClick={() => handleTagClick(course)}
          >
            <span className="mr-2 text-lg">{courseMetadata[course.name]?.emoji || course.emoji || "📚"}</span>
            {course.name}
          </span>
        ))}
      </div>
      {isMobile ? null : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <span className="font-semibold text-lg">{courseMetadata[selected?.name || ""]?.emoji || selected?.emoji || "📚"} {selected?.name}</span>
              </DialogTitle>
            </DialogHeader>
            {DetailContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default CourseSuggestions; 