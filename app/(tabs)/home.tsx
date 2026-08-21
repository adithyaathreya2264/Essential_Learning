import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  countStartedChapters,
  getMostRecentChapterActivity,
  getWeeklyStudySummary,
  type RecentChapterActivity,
  type WeeklyStudySummary,
} from '../../src/data/repositories/activityRepository';
import { countChaptersForSubject } from '../../src/data/repositories/chapterRepository';
import { getOverallQuizStats, getSubjectQuizStats } from '../../src/data/repositories/quizRepository';
import { listDueCards, type DueCard } from '../../src/data/repositories/reviewStateRepository';
import { listSubjects, type Subject } from '../../src/data/repositories/subjectRepository';
import { MODELS } from '../../src/core/constants/models';
import { useActiveModel } from '../../src/hooks/useModel';
import { useModelLoad } from '../../src/hooks/useModelLoad';
import { runDailyDueCheck } from '../../src/notifications/dailyDueCheck';
import { SubjectProgressCard } from '../../src/ui/components/SubjectProgressCard';
import { useTheme } from '../../src/ui/theme/ThemeProvider';

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type SubjectSummary = {
  subject: Subject;
  chapterCount: number;
  startedCount: number;
  quizAvgPercent: number | null;
};

function formatGB(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatLastActivity(epochMs: number): string {
  const then = new Date(epochMs);
  const now = new Date();
  const time = then.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(then)) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) return `Last opened today, ${time}`;
  if (dayDiff === 1) return `Last opened yesterday, ${time}`;
  return `Last opened ${then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

async function loadSubjectSummaries(): Promise<SubjectSummary[]> {
  const subjects = await listSubjects();
  return Promise.all(
    subjects.map(async (subject) => {
      const [chapterCount, startedCount, quizStats] = await Promise.all([
        countChaptersForSubject(subject.id),
        countStartedChapters(subject.id),
        getSubjectQuizStats(subject.id),
      ]);
      return { subject, chapterCount, startedCount, quizAvgPercent: quizStats?.avgPercent ?? null };
    })
  );
}

export default function HomeScreen() {
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const model = useActiveModel();
  const modelLoad = useModelLoad(model.status === 'verified');
  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const [dueCards, setDueCards] = useState<DueCard[]>([]);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [chaptersActive, setChaptersActive] = useState(0);
  const [avgQuizPercent, setAvgQuizPercent] = useState<number | null>(null);
  const [continueStudying, setContinueStudying] = useState<RecentChapterActivity | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStudySummary | null>(null);

  useEffect(() => {
    if (modelLoad.status !== 'ready') return;
    setShowReadyBanner(true);
    const timer = setTimeout(() => setShowReadyBanner(false), 4000);
    return () => clearTimeout(timer);
  }, [modelLoad.status]);

  useEffect(() => {
    runDailyDueCheck().catch((error) => {
      console.error('Failed to run daily due check', error);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      listDueCards().then((cards) => {
        if (!cancelled) setDueCards(cards);
      });
      loadSubjectSummaries().then((summaries) => {
        if (!cancelled) setSubjects(summaries);
      });
      countStartedChapters().then((count) => {
        if (!cancelled) setChaptersActive(count);
      });
      getOverallQuizStats().then((stats) => {
        if (!cancelled) setAvgQuizPercent(stats?.avgPercent ?? null);
      });
      getMostRecentChapterActivity().then((activity) => {
        if (!cancelled) setContinueStudying(activity);
      });
      getWeeklyStudySummary().then((summary) => {
        if (!cancelled) setWeekly(summary);
      });

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const dueChapterCount = new Set(dueCards.map((c) => c.chapterId)).size;

  return (
    <ScrollView
      style={{ backgroundColor: tokens.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}
    >
      <View>
        <Text style={[styles.greeting, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
          {getGreeting()}
        </Text>
        <Text style={[styles.subGreeting, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
          {subjects.length} subject{subjects.length === 1 ? '' : 's'} · {dueCards.length} due today
        </Text>
      </View>

      {model.status === 'downloading' ||
      model.status === 'paused' ||
      model.status === 'verifying' ||
      model.status === 'failed' ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md },
          ]}
        >
          <Text style={[styles.bannerTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
            {model.status === 'failed' ? 'AI setup interrupted' : 'Setting up your AI'}
          </Text>
          {model.status === 'failed' ? (
            <>
              <Text style={[styles.bannerBody, { color: tokens.error, fontFamily: fonts.ui, marginTop: spacing.xs / 2 }]}>
                The download stopped before finishing.
              </Text>
              <Pressable onPress={model.retry} style={{ marginTop: spacing.sm }}>
                <Text style={{ color: tokens.accent, fontFamily: fonts.uiMedium, fontSize: 13 }}>Retry</Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.bannerBody, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs / 2 }]}>
              {model.status === 'verifying'
                ? 'Verifying download...'
                : `${formatGB(model.bytesDownloaded)} / ${formatGB(model.totalBytes)} GB — downloading in the background, keep studying.`}
            </Text>
          )}
        </View>
      ) : modelLoad.status === 'failed' ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md },
          ]}
        >
          <Text style={[styles.bannerTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
            AI couldn't load
          </Text>
          <Text style={[styles.bannerBody, { color: tokens.error, fontFamily: fonts.ui, marginTop: spacing.xs / 2 }]}>
            {modelLoad.errorMessage}
          </Text>
          <Pressable onPress={modelLoad.retry} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: tokens.accent, fontFamily: fonts.uiMedium, fontSize: 13 }}>Retry</Text>
          </Pressable>
        </View>
      ) : modelLoad.status === 'ready' && showReadyBanner ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md },
          ]}
        >
          <Text style={[styles.bannerBody, { color: tokens.accent, fontFamily: fonts.ui }]}>
            {model.modelId ? MODELS[model.modelId].label : 'Model'} ready
          </Text>
        </View>
      ) : null}

      <View>
        <Text style={[styles.sectionHeading, { color: tokens.textSecondary, fontFamily: fonts.uiMedium }]}>
          Today at a glance
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          {[
            { value: String(dueCards.length), label: 'cards due' },
            { value: String(chaptersActive), label: 'chapters active' },
            { value: avgQuizPercent != null ? `${Math.round(avgQuizPercent)}%` : '—', label: 'avg quiz score' },
          ].map((stat) => (
            <View
              key={stat.label}
              style={[
                styles.glanceTile,
                { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.sm },
              ]}
            >
              <Text style={[styles.glanceValue, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
                {stat.value}
              </Text>
              <Text style={[styles.glanceLabel, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View>
        <Text style={[styles.sectionHeading, { color: tokens.textSecondary, fontFamily: fonts.uiMedium }]}>
          Due for review
        </Text>
        <Pressable
          onPress={() => router.push('/due-today')}
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.sm },
          ]}
        >
          <Text style={[styles.dueTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
            {dueCards.length} flashcard{dueCards.length === 1 ? '' : 's'} due
          </Text>
          <Text style={[styles.dueSubtitle, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
            Across {dueChapterCount} chapter{dueChapterCount === 1 ? '' : 's'}
          </Text>
          {dueCards.length > 0 ? (
            <Text style={[styles.reviewNow, { color: tokens.accent, fontFamily: fonts.uiMedium, marginTop: spacing.sm }]}>
              Review now
            </Text>
          ) : null}
        </Pressable>
      </View>

      {continueStudying ? (
        <View>
          <Text style={[styles.sectionHeading, { color: tokens.textSecondary, fontFamily: fonts.uiMedium }]}>
            Continue studying
          </Text>
          <Pressable
            onPress={() => router.push(`/chapter/${continueStudying.chapterId}/actions`)}
            style={[
              styles.card,
              { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.sm },
            ]}
          >
            <Text style={[styles.dueTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
              {continueStudying.chapterTitle}
            </Text>
            <Text style={[styles.dueSubtitle, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
              {continueStudying.subjectName}
            </Text>
            <Text style={[styles.dueSubtitle, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs / 2 }]}>
              {formatLastActivity(continueStudying.lastActivityAt)}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {weekly ? (
        <View>
          <Text style={[styles.sectionHeading, { color: tokens.textSecondary, fontFamily: fonts.uiMedium }]}>
            This week
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.sm },
            ]}
          >
            <Text style={[styles.dueTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
              Study streak: {weekly.streakDays} day{weekly.streakDays === 1 ? '' : 's'}
              {weekly.streakDays > 0 ? ' \u{1F525}' : ''}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
              {WEEK_LABELS.map((label, i) => (
                <View key={i} style={{ alignItems: 'center', gap: spacing.xs / 2 }}>
                  <Text style={[styles.weekLabel, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>{label}</Text>
                  <View
                    style={[
                      styles.weekDot,
                      { backgroundColor: weekly.weekDots[i] ? tokens.accent : tokens.background, borderColor: tokens.border },
                    ]}
                  />
                </View>
              ))}
            </View>

            <Text style={[styles.dueSubtitle, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.md }]}>
              {weekly.quizzesTaken} quiz{weekly.quizzesTaken === 1 ? '' : 'zes'} taken · {weekly.cardsReviewed} card
              {weekly.cardsReviewed === 1 ? '' : 's'} reviewed
            </Text>
          </View>
        </View>
      ) : null}

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.sectionHeading, { color: tokens.textSecondary, fontFamily: fonts.uiMedium }]}>
            Your subjects
          </Text>
          <Pressable onPress={() => router.push('/upload')}>
            <Text style={{ color: tokens.accent, fontFamily: fonts.uiMedium, fontSize: 13 }}>+ Add</Text>
          </Pressable>
        </View>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {subjects.map(({ subject, chapterCount, startedCount, quizAvgPercent: subjectQuizAvg }) => (
            <SubjectProgressCard
              key={subject.id}
              name={subject.name}
              chapterCount={chapterCount}
              startedCount={startedCount}
              quizAvgPercent={subjectQuizAvg}
              onPress={() => router.push(`/library/${subject.id}`)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 20 },
  subGreeting: { fontSize: 13, marginTop: 2 },
  banner: { borderWidth: StyleSheet.hairlineWidth },
  bannerTitle: { fontSize: 14 },
  bannerBody: { fontSize: 12 },
  sectionHeading: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4 },
  card: { borderWidth: StyleSheet.hairlineWidth },
  dueTitle: { fontSize: 15 },
  dueSubtitle: { fontSize: 12, marginTop: 2 },
  reviewNow: { fontSize: 13 },
  glanceTile: { flex: 1, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  glanceValue: { fontSize: 20 },
  glanceLabel: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  weekLabel: { fontSize: 11 },
  weekDot: { width: 16, height: 16, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
});
