-- Diagnose UI Configuration Tables
-- Stores static UI config that was previously hardcoded in frontend

-- Issue categories (engine noise, AC not cooling, etc.)
CREATE TABLE IF NOT EXISTS diagnose_issue_categories (
    id VARCHAR(100) PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    summary_meaning TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questions for each category
CREATE TABLE IF NOT EXISTS diagnose_questions (
    id VARCHAR(100) PRIMARY KEY,
    category_id VARCHAR(100) NOT NULL REFERENCES diagnose_issue_categories(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    question TEXT NOT NULL,
    options TEXT[] NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnose_questions_category_id ON diagnose_questions(category_id);

-- Possible issues for each category
CREATE TABLE IF NOT EXISTS diagnose_possible_issues (
    id VARCHAR(100) PRIMARY KEY,
    category_id VARCHAR(100) NOT NULL REFERENCES diagnose_issue_categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    badge VARCHAR(100) NOT NULL,
    badge_class VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    risks TEXT[] NOT NULL DEFAULT '{}',
    estimated_cost VARCHAR(100) NOT NULL,
    image_src TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnose_possible_issues_category_id ON diagnose_possible_issues(category_id);

-- Result summary cards
CREATE TABLE IF NOT EXISTS diagnose_result_summaries (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    heading TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    pill VARCHAR(100) NOT NULL,
    pill_class VARCHAR(255) NOT NULL,
    icon VARCHAR(100) NOT NULL,
    icon_class VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Next steps flow
CREATE TABLE IF NOT EXISTS diagnose_next_steps (
    id VARCHAR(100) PRIMARY KEY,
    step_number VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    meta VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trust items
CREATE TABLE IF NOT EXISTS diagnose_trust_items (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
