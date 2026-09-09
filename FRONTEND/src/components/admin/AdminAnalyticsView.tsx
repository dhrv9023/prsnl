import { useMemo } from "react";
import type { AdminStats, AdminUser } from "@/lib/api";
import {
  TrendingUp,
  Users,
  Activity,
  Zap,
  BarChart3,
  Download,
  Flame,
  UserCheck,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";

interface AdminAnalyticsViewProps {
  stats: AdminStats | null;
  users: AdminUser[];
  loading: boolean;
}

export function AdminAnalyticsView({ stats, users, loading }: AdminAnalyticsViewProps) {
  // ── 1. Cohort & Retention Calculations ───────────────────────────────────────
  const cohortData = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 3600 * 1000;

    let dau = 0;
    let wau = 0;
    let mau = 0;
    let inactive = 0;
    let unlimited = 0;
    let totalCreditsInCirculation = 0;

    for (const u of users) {
      if (u.is_unlimited) unlimited++;
      totalCreditsInCirculation += u.remaining_credits;

      if (!u.last_sign_in_at) {
        inactive++;
        continue;
      }
      const lastLoginMs = new Date(u.last_sign_in_at).getTime();
      const diff = now - lastLoginMs;

      if (diff <= dayMs) dau++;
      if (diff <= 7 * dayMs) wau++;
      if (diff <= 30 * dayMs) mau++;
      if (diff > 30 * dayMs) inactive++;
    }

    return {
      dau,
      wau,
      mau,
      inactive,
      unlimited,
      totalCreditsInCirculation,
      avgBalance: users.length > 0 ? Math.round(totalCreditsInCirculation / users.length) : 0,
    };
  }, [users]);

  // ── 2. Funnel Calculations ──────────────────────────────────────────────────
  const funnelStages = useMemo(() => {
    const totalUsers = stats?.total_users || users.length || 0;
    const totalResumes = stats?.total_resumes || 0;
    const totalAnalyses = stats?.total_analyses || 0;
    const totalInterviews = stats?.total_interviews || 0;
    const totalCoverLetters = stats?.total_cover_letters || 0;

    return [
      {
        id: "users",
        label: "Registered Users",
        count: totalUsers,
        pctOfTop: 100,
        sub: "Total signups",
        color: "bg-blue-500",
      },
      {
        id: "resumes",
        label: "Resumes Uploaded",
        count: totalResumes,
        pctOfTop: totalUsers > 0 ? Math.round((totalResumes / totalUsers) * 100) : 0,
        sub: totalUsers > 0 ? `${Math.round((totalResumes / totalUsers) * 100)}% upload rate` : "—",
        color: "bg-emerald-500",
      },
      {
        id: "analyses",
        label: "AI Analyses Run",
        count: totalAnalyses,
        pctOfTop: totalUsers > 0 ? Math.round((totalAnalyses / totalUsers) * 100) : 0,
        sub: totalResumes > 0 ? `${(totalAnalyses / totalResumes).toFixed(1)}x per resume` : "—",
        color: "bg-purple-500",
      },
      {
        id: "interviews",
        label: "Voice Interviews",
        count: totalInterviews,
        pctOfTop: totalUsers > 0 ? Math.round((totalInterviews / totalUsers) * 100) : 0,
        sub: totalUsers > 0 ? `${Math.round((totalInterviews / totalUsers) * 100)}% adoption` : "—",
        color: "bg-teal-500",
      },
      {
        id: "cover_letters",
        label: "Cover Letters",
        count: totalCoverLetters,
        pctOfTop: totalUsers > 0 ? Math.round((totalCoverLetters / totalUsers) * 100) : 0,
        sub: totalUsers > 0 ? `${Math.round((totalCoverLetters / totalUsers) * 100)}% adoption` : "—",
        color: "bg-amber-500",
      },
    ];
  }, [stats, users]);

  // ── 3. Feature Distribution Breakdown ──────────────────────────────────────
  const featureDistribution = useMemo(() => {
    const rawAnalyses = stats?.analysis_type_breakdown || {};
    const features = [
      { name: "ATS Match Score", key: "job_match_score", count: rawAnalyses.job_match_score || 0, color: "bg-blue-400" },
      { name: "Roast Analysis", key: "general_roast", count: rawAnalyses.general_roast || 0, color: "bg-rose-400" },
      { name: "Deep Roast", key: "deep_roast", count: rawAnalyses.deep_roast || 0, color: "bg-orange-400" },
      { name: "Deep Analysis", key: "deep_analysis", count: rawAnalyses.deep_analysis || 0, color: "bg-indigo-400" },
      { name: "Hiring Intel", key: "hiring_intel", count: rawAnalyses.hiring_intel || 0, color: "bg-violet-400" },
      { name: "Voice Mock Interview", key: "interview_report", count: stats?.total_interviews || 0, color: "bg-teal-400" },
      { name: "Cover Letter Gen", key: "cover_letter", count: stats?.total_cover_letters || 0, color: "bg-amber-400" },
    ];

    const totalActions = features.reduce((acc, f) => acc + f.count, 0);

    return features.map((f) => ({
      ...f,
      percentage: totalActions > 0 ? Math.round((f.count / totalActions) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [stats]);

  // ── 4. Credit Economy Telemetry ────────────────────────────────────────────
  const creditBurnRate = useMemo(() => {
    const granted = stats?.credit_stats?.total_credits_granted || 0;
    const used = stats?.credit_stats?.total_credits_used || 0;
    return granted > 0 ? Math.round((used / granted) * 100) : 0;
  }, [stats]);

  // ── 5. Export Telemetry Snapshot ───────────────────────────────────────────
  const handleExportTelemetry = () => {
    const payload = {
      exportTimestamp: new Date().toISOString(),
      summary: {
        totalUsers: stats?.total_users ?? users.length,
        newUsers7d: stats?.new_users_7d ?? 0,
        dau: cohortData.dau,
        wau: cohortData.wau,
        mau: cohortData.mau,
        inactiveUsers: cohortData.inactive,
        unlimitedAccounts: cohortData.unlimited,
      },
      funnel: funnelStages,
      featureDistribution,
      creditEconomics: {
        totalGranted: stats?.credit_stats?.total_credits_granted ?? 0,
        totalUsed: stats?.credit_stats?.total_credits_used ?? 0,
        burnRatePct: creditBurnRate,
        creditsInCirculation: cohortData.totalCreditsInCirculation,
        avgBalance: cohortData.avgBalance,
        perFeatureUsage: stats?.credit_stats?.per_feature_usage ?? {},
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kareerist-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Business Intelligence & User Telemetry
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time conversion funnels, credit burn velocity, and retention cohorts.
          </p>
        </div>
        <button
          onClick={handleExportTelemetry}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/50 text-foreground text-xs font-semibold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-accent" />
          Export Snapshot (.JSON)
        </button>
      </div>

      {/* KPI Headline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DAU / Active Pulse */}
        <div className="p-5 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Daily Active (24h)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-foreground">
            {loading ? "…" : cohortData.dau}
          </p>
          <p className="text-xs text-muted-foreground">
            {cohortData.wau} active this week ({cohortData.mau} 30-day MAU)
          </p>
        </div>

        {/* Funnel Conversion */}
        <div className="p-5 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Upload Conversion
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-blue-400">
            {loading ? "…" : `${funnelStages[1].pctOfTop}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            {stats?.total_resumes || 0} resumes uploaded from {stats?.total_users || users.length} users
          </p>
        </div>

        {/* Credit Burn Rate */}
        <div className="p-5 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Credit Burn Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-amber-400">
            {loading ? "…" : `${creditBurnRate}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            {stats?.credit_stats?.total_credits_used || 0} used of {stats?.credit_stats?.total_credits_granted || 0} granted
          </p>
        </div>

        {/* Avg User Balance */}
        <div className="p-5 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Avg User Balance
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-purple-400">
            {loading ? "…" : `${cohortData.avgBalance} cr`}
          </p>
          <p className="text-xs text-muted-foreground">
            {cohortData.totalCreditsInCirculation.toLocaleString()} active credits held
          </p>
        </div>
      </div>

      {/* Conversion Funnel Visualization */}
      <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">User Activation & Conversion Funnel</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Progression from account creation through core feature engagement
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground uppercase px-2.5 py-1 rounded-md bg-secondary/40 border border-border/30">
            Lifecycle
          </span>
        </div>

        <div className="space-y-4">
          {funnelStages.map((stage, idx) => (
            <div key={stage.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-secondary/80 flex items-center justify-center text-[10px] font-mono text-muted-foreground">
                    {idx + 1}
                  </span>
                  {stage.label}
                </span>
                <span className="font-mono text-muted-foreground">
                  <strong className="text-foreground">{stage.count}</strong> ({stage.pctOfTop}% • {stage.sub})
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-secondary/30 overflow-hidden">
                <div
                  className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                  style={{ width: `${Math.max(4, stage.pctOfTop)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Feature Popularity + User Retention Cohorts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Distribution */}
        <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Feature Adoption Breakdown</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Relative popularity across resume, interview, and letter tools
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>

          <div className="space-y-3.5">
            {featureDistribution.map((item) => (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium">{item.name}</span>
                  <span className="font-mono text-muted-foreground">
                    <strong className="text-foreground">{item.count}</strong> ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${Math.max(2, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Activity & Retention Cohorts */}
        <div className="p-6 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">User Retention & Activity Segments</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Based on login timestamps and account permissions
              </p>
            </div>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-secondary/20 border border-border/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                Active (≤ 7 Days)
              </div>
              <p className="text-2xl font-bold text-foreground">{cohortData.wau}</p>
              <p className="text-[11px] text-muted-foreground">
                {users.length > 0 ? Math.round((cohortData.wau / users.length) * 100) : 0}% of all registered
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/20 border border-border/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                <Users className="w-3.5 h-3.5" />
                Monthly Active (≤ 30d)
              </div>
              <p className="text-2xl font-bold text-foreground">{cohortData.mau}</p>
              <p className="text-[11px] text-muted-foreground">
                {users.length > 0 ? Math.round((cohortData.mau / users.length) * 100) : 0}% 30-day retention
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/20 border border-border/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                Dormant (&gt; 30d / Never)
              </div>
              <p className="text-2xl font-bold text-foreground">{cohortData.inactive}</p>
              <p className="text-[11px] text-muted-foreground">Re-engagement candidates</p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/20 border border-border/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-violet-400 font-medium">
                <Award className="w-3.5 h-3.5" />
                Unlimited VIPs
              </div>
              <p className="text-2xl font-bold text-foreground">{cohortData.unlimited}</p>
              <p className="text-[11px] text-muted-foreground">Special pass accounts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
