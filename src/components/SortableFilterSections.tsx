import { createContext, useContext, useRef, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FILTER_SECTION_TITLES, type FilterSectionId } from '../utils/filterSections';
import { ICON_BUTTON, ICON_BUTTON_QUIET } from './CloseButton';

// #199: the Songlist sidebar sections reorder by drag & drop, with dnd-kit (the standard
// React library, no home-made drag code). A section is grabbed by the ⋮⋮ handle in its
// header: a long press on touch (so scrolling never drags), a plain drag with a mouse, or
// from the keyboard — Space to pick up, arrows to move, Space to drop, Escape to cancel —
// with the moves announced by section title.
const title = (id: UniqueIdentifier) => FILTER_SECTION_TITLES[id as FilterSectionId] ?? String(id);

// dnd-kit also reports the section "over" its own place right after the pick-up; saying it
// would overwrite "Picked up …", so it is only announced once the section has moved.
function announcements(order: readonly FilterSectionId[], moved: { current: boolean }): Announcements {
  const position = (id?: UniqueIdentifier) => `position ${order.indexOf(id as FilterSectionId) + 1} of ${order.length}`;
  return {
    onDragStart: ({ active }) => {
      moved.current = false;
      return `Picked up ${title(active.id)}, ${position(active.id)}.`;
    },
    onDragOver: ({ active, over }) => {
      if (!over) return `${title(active.id)} is not over a place to drop.`;
      if (over.id === active.id && !moved.current) return undefined;
      moved.current = true;
      return `${title(active.id)} moved to ${position(over.id)}.`;
    },
    onDragEnd: ({ active, over }) => (over ? `${title(active.id)} dropped at ${position(over.id)}.` : `${title(active.id)} dropped.`),
    onDragCancel: ({ active }) => `Moving ${title(active.id)} was cancelled.`,
  };
}

const screenReaderInstructions = {
  draggable: 'To move a filter section, press Space to pick it up, the arrow keys to move it, Space to drop it, or Escape to cancel.',
};

export function SortableFilterSections({ order, onMove, children }: {
  /** The sections on screen, in order (those waiting for an instrument are left out, so
   *  announced positions match what the user sees). */
  order: readonly FilterSectionId[];
  onMove: (id: FilterSectionId, overId: FilterSectionId) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const moved = useRef(false);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(active.id as FilterSectionId, over.id as FilterSectionId);
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{ announcements: announcements(order, moved), screenReaderInstructions }}
    >
      <SortableContext items={[...order]} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

type Handle = Pick<ReturnType<typeof useSortable>, 'attributes' | 'listeners' | 'setActivatorNodeRef'>;
const HandleContext = createContext<Handle | null>(null);

/** One sortable section; its header shows a <SectionDragHandle>. */
export function SortableSection({ id, children }: { id: FilterSectionId; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition: slide, isDragging } = useSortable({ id });
  // The neighbours slide aside while a section is dragged — unless the user asked the
  // system to reduce motion (#160): then they jump into place.
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <div
      ref={setNodeRef}
      data-filter-section={id}
      style={{ transform: CSS.Translate.toString(transform), transition: reduceMotion ? undefined : slide }}
      className={isDragging ? 'relative z-10 opacity-80' : undefined}
    >
      <HandleContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>{children}</HandleContext.Provider>
    </div>
  );
}

/** The ⋮⋮ grip in a section header ("Move Genre filters"). */
export function SectionDragHandle({ id }: { id: FilterSectionId }) {
  const handle = useContext(HandleContext);
  if (!handle) return null;
  return (
    <button
      type="button"
      ref={handle.setActivatorNodeRef}
      {...handle.attributes}
      {...handle.listeners}
      aria-label={`Move ${FILTER_SECTION_TITLES[id]}`}
      title={`Move ${FILTER_SECTION_TITLES[id]}`}
      className={`${ICON_BUTTON} ${ICON_BUTTON_QUIET} cursor-grab touch-none active:cursor-grabbing`}
    >
      <span aria-hidden="true">⋮⋮</span>
    </button>
  );
}
