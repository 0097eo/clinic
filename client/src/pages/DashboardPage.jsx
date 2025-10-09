import { useEffect, useState } from 'react';
import { QuickStats } from '../components/QuickStats';
import { BusinessInsights } from '../components/BusinessInsights';
import { UpcomingAppointments } from '../components/UpcomingAppointments';
import {
  quickStats as defaultStats,
  upcomingAppointments as defaultAppointments,
  businessInsights as defaultInsights
} from '../data/dashboard';
import { useAuth } from '../context/AuthContext';
import { getAppointments, getBilling, getPatientCount } from '../services/api';

function formatCurrency(amount) {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return 'KES 0';
  }
  return `KES ${numeric.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
}

export function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(defaultStats);
  const [appointments, setAppointments] = useState(defaultAppointments);
  const [insights, setInsights] = useState(defaultInsights);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const today = new Date();
        const todayParam = today.toISOString().split('T')[0];

        const [
          patientsTotal,
          todaysAppointments,
          scheduledAppointments,
          totalAppointments,
          completedAppointments,
          billingSummary
        ] = await Promise.all([
          getPatientCount(token),
          getAppointments({ date: todayParam, pageSize: 1 }, token),
          getAppointments({ status: 'SCHEDULED', pageSize: 10 }, token),
          getAppointments({ pageSize: 1 }, token),
          getAppointments({ status: 'COMPLETED', pageSize: 1 }, token),
          getBilling({ pageSize: 100 }, token)
        ]);

        if (!active) return;

        const todaysCount = todaysAppointments?.pagination?.total ?? 0;
        const totalCount = totalAppointments?.pagination?.total ?? 0;
        const completedCount = completedAppointments?.pagination?.total ?? 0;

        const monthlyRevenue = (billingSummary?.data ?? []).reduce((acc, bill) => {
          const createdAt = bill.createdAt ? new Date(bill.createdAt) : null;
          if (
            createdAt &&
            createdAt.getMonth() === today.getMonth() &&
            createdAt.getFullYear() === today.getFullYear()
          ) {
            const amount = Number(bill.paidAmount ?? 0);
            return acc + (Number.isFinite(amount) ? amount : Number(bill.paidAmount?.toString() ?? 0));
          }
          return acc;
        }, 0);

        const satisfactionPercent =
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        setStats((prev) =>
          prev.map((item) => {
            switch (item.id) {
              case 'patients':
                return {
                  ...item,
                  value: patientsTotal.toLocaleString(),
                  delta: null,
                  trend: null
                };
              case 'appointments':
                return {
                  ...item,
                  value: todaysCount.toLocaleString(),
                  delta: null,
                  trend: null
                };
              case 'revenue':
                return {
                  ...item,
                  value: formatCurrency(monthlyRevenue),
                  delta: null,
                  trend: null
                };
              case 'satisfaction':
                return {
                  ...item,
                  value: `${satisfactionPercent}%`,
                  delta: null,
                  trend: satisfactionPercent >= 80 ? 'up' : 'down'
                };
              default:
                return item;
            }
          })
        );

        const appointmentItems = (scheduledAppointments?.data ?? [])
          .map((entry) => {
            const baseDate = entry.date ? new Date(entry.date) : new Date(today);
            if (entry.time) {
              const [hours, minutes] = entry.time.split(':');
              baseDate.setHours(Number(hours) || 0, Number(minutes) || 0);
            }
            return {
              id: entry.id,
              dateTime: baseDate,
              time: baseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              name: entry.patient?.fullName ?? 'Unknown patient',
              type: entry.department ?? 'General',
              doctor: entry.doctor?.fullName ? `Dr. ${entry.doctor.fullName}` : 'Clinic Team',
              status: entry.status ?? 'SCHEDULED'
            };
          })
          .sort((a, b) => a.dateTime - b.dateTime)
          .slice(0, 6);

        setAppointments(appointmentItems);

        const billingData = Array.isArray(billingSummary?.data) ? billingSummary.data : [];
        const totalBilled = billingData.reduce(
          (acc, bill) => acc + (Number.isFinite(Number(bill.totalAmount)) ? Number(bill.totalAmount) : 0),
          0
        );
        const totalCollected = billingData.reduce(
          (acc, bill) => acc + (Number.isFinite(Number(bill.paidAmount)) ? Number(bill.paidAmount) : 0),
          0
        );
        const totalOutstanding = billingData.reduce(
          (acc, bill) => acc + (Number.isFinite(Number(bill.outstandingBalance)) ? Number(bill.outstandingBalance) : 0),
          0
        );

        const outstandingByPatient = billingData.reduce((acc, bill) => {
          if (!bill.patient?.fullName) return acc;
          const current = acc.get(bill.patient.fullName) ?? 0;
          const outstanding = Number(bill.outstandingBalance) || 0;
          acc.set(bill.patient.fullName, current + outstanding);
          return acc;
        }, new Map());

        let topOutstandingPatient = null;
        outstandingByPatient.forEach((value, key) => {
          if (!topOutstandingPatient || value > topOutstandingPatient.amount) {
            topOutstandingPatient = { name: key, amount: value };
          }
        });

        const departmentCounts = appointmentItems.reduce((acc, item) => {
          const key = item.type || 'General';
          acc.set(key, (acc.get(key) ?? 0) + 1);
          return acc;
        }, new Map());

        let topDepartment = null;
        departmentCounts.forEach((value, key) => {
          if (!topDepartment || value > topDepartment.count) {
            topDepartment = { department: key, count: value };
          }
        });

        const doctorCounts = appointmentItems.reduce((acc, item) => {
          const key = item.doctor || 'Clinic Team';
          acc.set(key, (acc.get(key) ?? 0) + 1);
          return acc;
        }, new Map());

        let topDoctor = null;
        doctorCounts.forEach((value, key) => {
          if (!topDoctor || value > topDoctor.count) {
            topDoctor = { doctor: key, count: value };
          }
        });

        const nextInsights = [];

        if (totalOutstanding > 0) {
          nextInsights.push({
            id: 'outstanding',
            title: 'Outstanding balances',
            highlight: formatCurrency(totalOutstanding),
            detail: topOutstandingPatient
              ? `${topOutstandingPatient.name} owes ${formatCurrency(topOutstandingPatient.amount)}`
              : 'Monitor overdue patient accounts to improve cash flow.'
          });
        }

        if (totalBilled > 0 && totalCollected >= 0) {
          const collectionRate = Math.min(100, Math.round((totalCollected / totalBilled) * 100));
          nextInsights.push({
            id: 'collection',
            title: 'Collection rate',
            highlight: `${collectionRate}%`,
            detail:
              collectionRate >= 85
                ? 'Great job! Collections are on track.'
                : 'Consider following up on overdue invoices to boost collections.'
          });
        }

        if (topDepartment) {
          nextInsights.push({
            id: 'department',
            title: 'Busiest department',
            highlight: topDepartment.department,
            detail: `${topDepartment.count} upcoming bookings`
          });
        }

        if (topDoctor) {
          nextInsights.push({
            id: 'provider',
            title: 'Most booked provider',
            highlight: topDoctor.doctor.replace(/^Dr\.\s/, ''),
            detail: `${topDoctor.count} appointments scheduled`
          });
        }

        setInsights(nextInsights);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        if (active) {
          setError(err?.details?.message || err?.message || 'Failed to load dashboard data');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="page-stack">
      <QuickStats stats={stats} />

      {insights.length > 0 ? <BusinessInsights insights={insights} /> : null}

      {error ? (
        <div className="panel panel--error">
          <p className="panel__eyebrow">Dashboard Error</p>
          <h2 className="panel__title">{error}</h2>
          <p>Please refresh the page or verify your API credentials.</p>
        </div>
      ) : null}

      <div className="panel">
        <UpcomingAppointments items={appointments} />
      </div>

      {loading ? <p className="page-loading">Refreshing dashboard…</p> : null}
    </div>
  );
}
