// Story 3.4: ShiftKanbanCard Component Tests
// Unit tests for individual shift cards with drag-and-drop functionality

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DndContext } from '@dnd-kit/core';

import { ShiftKanbanCard } from '@/components/dashboard/kanban/ShiftKanbanCard';

// Mock shift data
const mockShift = {
  id: 'shift-1',
  status: 'unassigned',
  client_info: { name: 'Test Security Corp', contact: 'John Doe' },
  location_data: { 
    siteName: 'Downtown Office Building',
    address: '123 Main St, Austin, TX'
  },
  time_range: '[2025-08-29T09:00:00Z,2025-08-29T17:00:00Z)',
  priority: 2,
  required_certifications: ['Level III', 'Armed'],
  assigned_guard_id: null,
  shift_assignments: [],
  shift_urgency_alerts: [{
    id: 'alert-1',
    alert_type: 'unassigned_24h',
    alert_priority: 'high',
    hours_until_shift: 18
  }],
  special_instructions: 'Monitor main entrance',
  created_at: '2025-08-28T10:00:00Z',
  updated_at: '2025-08-28T12:00:00Z'
};

const mockAssignedShift = {
  ...mockShift,
  id: 'shift-2',
  status: 'assigned',
  assigned_guard_id: 'guard-123',
  shift_assignments: [{
    id: 'assign-1',
    assignment_status: 'confirmed',
    guard_profiles: {
      first_name: 'Jane',
      last_name: 'Smith',
      phone_number: '555-0123'
    }
  }],
  shift_urgency_alerts: []
};

describe('ShiftKanbanCard', () => {
  const mockOnSelectionChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shift basic information correctly', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Test Security Corp')).toBeInTheDocument();
    expect(screen.getByText('Downtown Office Building')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, Austin, TX')).toBeInTheDocument();
  });

  it('displays time range in readable format', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    // Should display formatted time range
    expect(screen.getByText(/09:00.*17:00/)).toBeInTheDocument();
  });

  it('shows priority indicator with correct styling', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Priority 2')).toBeInTheDocument();
  });

  it('displays required certifications as badges', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Level III')).toBeInTheDocument();
    expect(screen.getByText('Armed')).toBeInTheDocument();
  });

  it('shows unassigned status correctly', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByLabelText(/unassigned shift/i)).toBeInTheDocument();
  });

  it('displays assigned guard information', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockAssignedShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('555-0123')).toBeInTheDocument();
  });

  it('shows urgent alert indicator', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(screen.getByText('18h until shift')).toBeInTheDocument();
    expect(screen.getByLabelText(/urgent alert/i)).toBeInTheDocument();
  });

  it('handles selection toggle', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith('shift-1', true);
  });

  it('applies selected styling when selected', () => {
    const { container } = render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={true}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(container.firstChild).toHaveClass('ring-2 ring-primary');
  });

  it('applies drag overlay styling', () => {
    const { container } = render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={true}
        />
      </DndContext>
    );

    expect(container.firstChild).toHaveClass('rotate-6 scale-105');
  });

  it('displays special instructions when provided', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Monitor main entrance')).toBeInTheDocument();
  });

  it('shows confirmation status for assigned shifts', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockAssignedShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', () => {
    const minimalShift = {
      id: 'shift-minimal',
      status: 'unassigned',
      client_info: { name: 'Basic Client' },
      location_data: { siteName: 'Basic Site' },
      time_range: '[2025-08-29T09:00:00Z,2025-08-29T17:00:00Z)',
      priority: 1
    };

    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={minimalShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(screen.getByText('Basic Client')).toBeInTheDocument();
    expect(screen.getByText('Basic Site')).toBeInTheDocument();
  });

  it('provides proper accessibility attributes', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <ShiftKanbanCard
          shift={mockShift}
          isSelected={false}
          onSelectionChange={mockOnSelectionChange}
          isDragOverlay={false}
        />
      </DndContext>
    );

    expect(screen.getByRole('button', { name: /shift card/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toHaveAccessibleName();
  });

  it('shows different status colors correctly', () => {
    const statusShifts = [
      { ...mockShift, status: 'in_progress' },
      { ...mockShift, status: 'completed' },
      { ...mockShift, status: 'issue_logged' }
    ];

    statusShifts.forEach((shift, index) => {
      const { container } = render(
        <DndContext onDragEnd={() => {}}>
          <ShiftKanbanCard
            shift={shift}
            isSelected={false}
            onSelectionChange={mockOnSelectionChange}
            isDragOverlay={false}
          />
        </DndContext>
      );

      // Each status should have different border colors
      expect(container.firstChild).toHaveClass('border-l-4');
    });
  });
});