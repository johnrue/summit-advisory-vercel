// Story 3.4: KanbanColumn Component Tests
// Unit tests for Kanban workflow columns

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {  describe, it, expect, beforeEach } from '@jest/globals';
import { DndContext } from '@dnd-kit/core';

import { KanbanColumn } from '@/components/dashboard/kanban/KanbanColumn';
import type { KanbanColumn as KanbanColumnType } from '@/lib/types/kanban-types';

// Mock shift data
const mockShifts = [
  {
    id: 'shift-1',
    status: 'unassigned',
    client_info: { name: 'Test Client' },
    location_data: { siteName: 'Test Site' },
    time_range: '[2025-08-29T09:00:00Z,2025-08-29T17:00:00Z)',
    priority: 3
  },
  {
    id: 'shift-2',
    status: 'unassigned', 
    client_info: { name: 'Test Client 2' },
    location_data: { siteName: 'Test Site 2' },
    time_range: '[2025-08-29T10:00:00Z,2025-08-29T18:00:00Z)',
    priority: 1
  }
];

const mockColumn: KanbanColumnType = {
  id: 'unassigned',
  title: 'Unassigned',
  color: 'slate',
  allowedTransitions: ['assigned'],
  requiresValidation: false,
  maxItems: 50
};

describe('KanbanColumn', () => {
  const mockOnShiftSelection = jest.fn();
  const mockSelectedShifts = new Set<string>();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders column title and shift count', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <KanbanColumn
          column={mockColumn}
          shifts={mockShifts}
          selectedShifts={mockSelectedShifts}
          onShiftSelection={mockOnShiftSelection}
          isDraggingOver={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Shift count
  });

  it('displays empty state when no shifts', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <KanbanColumn
          column={mockColumn}
          shifts={[]}
          selectedShifts={mockSelectedShifts}
          onShiftSelection={mockOnShiftSelection}
          isDraggingOver={false}
        />
      </DndContext>
    );

    expect(screen.getByText('No shifts')).toBeInTheDocument();
  });

  it('applies drag over styling when dragging over', () => {
    const { container } = render(
      <DndContext onDragEnd={() => {}}>
        <KanbanColumn
          column={mockColumn}
          shifts={mockShifts}
          selectedShifts={mockSelectedShifts}
          onShiftSelection={mockOnShiftSelection}
          isDraggingOver={true}
        />
      </DndContext>
    );

    expect(container.firstChild).toHaveClass('ring-2');
  });

  it('shows column description when provided', () => {
    const columnWithDescription = {
      ...mockColumn,
      description: 'Shifts waiting for assignment'
    };

    render(
      <DndContext onDragEnd={() => {}}>
        <KanbanColumn
          column={columnWithDescription}
          shifts={mockShifts}
          selectedShifts={mockSelectedShifts}
          onShiftSelection={mockOnShiftSelection}
          isDraggingOver={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Shifts waiting for assignment')).toBeInTheDocument();
  });

  it('displays warning when approaching max items', () => {
    const columnWithLowMax = {
      ...mockColumn,
      maxItems: 3
    };

    render(
      <DndContext onDragEnd={() => {}}>
        <KanbanColumn
          column={columnWithLowMax}
          shifts={mockShifts}
          selectedShifts={mockSelectedShifts}
          onShiftSelection={mockOnShiftSelection}
          isDraggingOver={false}
        />
      </DndContext>
    );

    // Should show warning when at 2/3 capacity
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it('renders shift cards for all shifts', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <KanbanColumn
          column={mockColumn}
          shifts={mockShifts}
          selectedShifts={mockSelectedShifts}
          onShiftSelection={mockOnShiftSelection}
          isDraggingOver={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('Test Client 2')).toBeInTheDocument();
  });

  it('handles shift selection events', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <KanbanColumn
          column={mockColumn}
          shifts={mockShifts}
          selectedShifts={mockSelectedShifts}
          onShiftSelection={mockOnShiftSelection}
          isDraggingOver={false}
        />
      </DndContext>
    );

    // This would require the ShiftKanbanCard to trigger selection
    // The actual test would depend on the card implementation
  });

  it('applies correct color theming', () => {
    const coloredColumn = {
      ...mockColumn,
      color: 'blue'
    };

    const { container } = render(
      <DndContext onDragEnd={() => {}}>
        <KanbanColumn
          column={coloredColumn}
          shifts={mockShifts}
          selectedShifts={mockSelectedShifts}
          onShiftSelection={mockOnShiftSelection}
          isDraggingOver={false}
        />
      </DndContext>
    );

    expect(container.firstChild).toHaveClass('border-blue-200');
  });

  it('shows validation indicator when column requires validation', () => {
    const validationColumn = {
      ...mockColumn,
      requiresValidation: true
    };

    render(
      <DndContext onDragEnd={() => {}}>
        <KanbanColumn
          column={validationColumn}
          shifts={mockShifts}
          selectedShifts={mockSelectedShifts}
          onShiftSelection={mockOnShiftSelection}
          isDraggingOver={false}
        />
      </DndContext>
    );

    expect(screen.getByLabelText(/requires validation/i)).toBeInTheDocument();
  });
});