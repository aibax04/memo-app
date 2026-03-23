import React from 'react';
import type { GroupedAnalysisData } from '@/services/meetingApi';

function asStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string');
}

function asThemeList(
    v: unknown
): Array<{ theme?: string; evidence?: string; meetings_referenced?: string[] }> {
    if (!Array.isArray(v)) return [];
    return v
        .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
        .map(x => ({
            theme: typeof x.theme === 'string' ? x.theme : undefined,
            evidence: typeof x.evidence === 'string' ? x.evidence : undefined,
            meetings_referenced: Array.isArray(x.meetings_referenced)
                ? x.meetings_referenced.filter((m): m is string => typeof m === 'string')
                : undefined,
        }));
}

function asActionList(
    v: unknown
): Array<{ task?: string; owner_guess?: string; priority?: string; related_meeting?: string }> {
    if (!Array.isArray(v)) return [];
    return v
        .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
        .map(x => ({
            task: typeof x.task === 'string' ? x.task : undefined,
            owner_guess: typeof x.owner_guess === 'string' ? x.owner_guess : undefined,
            priority: typeof x.priority === 'string' ? x.priority : undefined,
            related_meeting: typeof x.related_meeting === 'string' ? x.related_meeting : undefined,
        }));
}

function asHighlightList(v: unknown): Array<{ meeting_title?: string; one_line?: string }> {
    if (!Array.isArray(v)) return [];
    return v
        .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
        .map(x => ({
            meeting_title: typeof x.meeting_title === 'string' ? x.meeting_title : undefined,
            one_line: typeof x.one_line === 'string' ? x.one_line : undefined,
        }));
}

export const GroupedAnalysisViewer: React.FC<{ analysis: GroupedAnalysisData }> = ({ analysis }) => {
    const summary =
        typeof analysis.executive_summary === 'string' ? analysis.executive_summary : '';
    const themes = asThemeList(analysis.themes_across_meetings);
    const timeline =
        typeof analysis.timeline_and_progression === 'string'
            ? analysis.timeline_and_progression
            : '';
    const actions = asActionList(analysis.consolidated_action_items);
    const risks = asStringArray(analysis.risks_and_gaps);
    const opportunities = asStringArray(analysis.opportunities);
    const nextSteps = asStringArray(analysis.recommended_next_steps);
    const highlights = asHighlightList(analysis.per_meeting_highlights);

    const summaryParagraphs = summary.split(/\n\n+/).filter(Boolean);

    return (
        <div className="space-y-8 text-slate-800">
            {summaryParagraphs.length > 0 && (
                <section>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#1B2BB8] mb-3">
                        Executive summary
                    </h3>
                    <div className="space-y-3 text-sm leading-relaxed font-medium text-slate-700">
                        {summaryParagraphs.map((p, i) => (
                            <p key={i}>{p}</p>
                        ))}
                    </div>
                </section>
            )}

            {highlights.length > 0 && (
                <section>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#1B2BB8] mb-3">
                        Per-meeting highlights
                    </h3>
                    <ul className="space-y-2">
                        {highlights.map((h, i) => (
                            <li
                                key={i}
                                className="text-sm border border-slate-100 rounded-xl p-3 bg-slate-50/80"
                            >
                                <span className="font-bold text-slate-900">
                                    {h.meeting_title || 'Meeting'}
                                </span>
                                <span className="text-slate-600"> — {h.one_line}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {themes.length > 0 && (
                <section>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#1B2BB8] mb-3">
                        Themes across meetings
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {themes.map((t, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <p className="font-bold text-slate-900 text-sm mb-1">{t.theme}</p>
                                <p className="text-xs text-slate-600 leading-relaxed">{t.evidence}</p>
                                {t.meetings_referenced && t.meetings_referenced.length > 0 && (
                                    <p className="text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-wide">
                                        {t.meetings_referenced.join(' · ')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {timeline && (
                <section>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#1B2BB8] mb-3">
                        Timeline & progression
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {timeline}
                    </p>
                </section>
            )}

            {actions.length > 0 && (
                <section>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#1B2BB8] mb-3">
                        Consolidated action items
                    </h3>
                    <ul className="space-y-2">
                        {actions.map((a, i) => (
                            <li
                                key={i}
                                className="flex flex-col sm:flex-row sm:items-start gap-2 text-sm border border-emerald-100 bg-emerald-50/40 rounded-xl p-3"
                            >
                                <span className="flex-1 font-medium text-slate-800">{a.task}</span>
                                <span className="text-xs text-slate-500 shrink-0">
                                    {a.priority && (
                                        <span className="font-bold uppercase mr-2">{a.priority}</span>
                                    )}
                                    {a.owner_guess && <span>Owner: {a.owner_guess}</span>}
                                    {a.related_meeting && (
                                        <span className="block text-slate-400 mt-0.5">
                                            {a.related_meeting}
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {(risks.length > 0 || opportunities.length > 0) && (
                <div className="grid md:grid-cols-2 gap-6">
                    {risks.length > 0 && (
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest text-red-700 mb-3">
                                Risks & gaps
                            </h3>
                            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                {risks.map((r, i) => (
                                    <li key={i}>{r}</li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {opportunities.length > 0 && (
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-700 mb-3">
                                Opportunities
                            </h3>
                            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                {opportunities.map((o, i) => (
                                    <li key={i}>{o}</li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            )}

            {nextSteps.length > 0 && (
                <section>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#1B2BB8] mb-3">
                        Recommended next steps
                    </h3>
                    <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2">
                        {nextSteps.map((s, i) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ol>
                </section>
            )}
        </div>
    );
};

export default GroupedAnalysisViewer;
