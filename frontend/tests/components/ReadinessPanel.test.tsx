import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReadinessPanel from '../../src/components/readiness/ReadinessPanel';
import type { ReleaseReadiness } from '../../src/types';

describe('ReadinessPanel', () => {
  const base: ReleaseReadiness = {
    releaseId: 'rel-1',
    releaseName: 'v2.4.0',
    lifecycleState: 'PLANNED',
    status: 'NOT_READY',
    reasons: [],
    totalWorkItems: 3,
    completedWorkItems: 1,
  };

  const notReady: ReleaseReadiness = {
    ...base,
    reasons: [
      {
        code: 'INCOMPLETE_WORK',
        workItemId: 't1',
        workItemTitle: 'Checkout flow',
        detail: '"Checkout flow" is IN_PROGRESS, not DONE',
      },
      {
        code: 'INCOMPLETE_WORK',
        workItemId: 't2',
        workItemTitle: 'Rounding fix',
        detail: '"Rounding fix" is TODO, not DONE',
      },
      {
        code: 'BLOCKED_WORK',
        workItemId: 't1',
        workItemTitle: 'Checkout flow',
        detail: '"Checkout flow" is blocked by "Payment gateway" (TODO)',
      },
    ],
  };

  it('renders nothing before readiness has loaded', () => {
    const { container } = render(<ReadinessPanel readiness={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows READY with no reasons when every gate passes', () => {
    render(
      <ReadinessPanel
        readiness={{ ...base, status: 'READY', reasons: [], completedWorkItems: 3 }}
      />
    );

    expect(screen.getByTestId('readiness-status')).toHaveTextContent('READY');
    expect(screen.queryByTestId('readiness-reasons')).not.toBeInTheDocument();
    expect(screen.getByText('3 of 3 work items complete')).toBeInTheDocument();
  });

  it('shows NOT READY with every reason the server returned', () => {
    render(<ReadinessPanel readiness={notReady} />);

    expect(screen.getByTestId('readiness-status')).toHaveTextContent('NOT READY');
    expect(screen.getByText('"Checkout flow" is IN_PROGRESS, not DONE')).toBeInTheDocument();
    expect(screen.getByText('"Rounding fix" is TODO, not DONE')).toBeInTheDocument();
    expect(
      screen.getByText('"Checkout flow" is blocked by "Payment gateway" (TODO)')
    ).toBeInTheDocument();
  });

  it('surfaces the machine-readable codes alongside the human detail', () => {
    render(<ReadinessPanel readiness={notReady} />);

    expect(screen.getByText('INCOMPLETE_WORK')).toBeInTheDocument();
    expect(screen.getByText('BLOCKED_WORK')).toBeInTheDocument();
  });

  it('preserves the order the server sent rather than re-sorting', () => {
    render(<ReadinessPanel readiness={notReady} />);

    const rendered = screen.getByTestId('readiness-reasons').textContent ?? '';
    expect(rendered.indexOf('Checkout flow" is IN_PROGRESS'))
      .toBeLessThan(rendered.indexOf('Rounding fix'));
    expect(rendered.indexOf('Rounding fix'))
      .toBeLessThan(rendered.indexOf('blocked by'));
  });

  it('collapses and expands the reason list', () => {
    render(<ReadinessPanel readiness={notReady} />);

    const toggle = screen.getByRole('button', { name: /3 reasons/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    expect(screen.queryByTestId('readiness-reasons')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByTestId('readiness-reasons')).toBeInTheDocument();
  });

  it('explains a cancelled release', () => {
    render(
      <ReadinessPanel
        readiness={{
          ...base,
          lifecycleState: 'CANCELLED',
          reasons: [{
            code: 'RELEASE_CANCELLED',
            workItemId: null,
            workItemTitle: null,
            detail: 'Release v2.4.0 has been cancelled',
          }],
        }}
      />
    );

    expect(screen.getByText('Release v2.4.0 has been cancelled')).toBeInTheDocument();
    expect(screen.getByText('RELEASE_CANCELLED')).toBeInTheDocument();
  });
});
