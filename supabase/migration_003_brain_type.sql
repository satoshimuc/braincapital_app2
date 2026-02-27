-- ============================================
-- Migration 003: Brain Type columns
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add brain type columns to assessment_results
alter table assessment_results
  add column if not exists brain_type      text,
  add column if not exists brain_type_name text,
  add column if not exists brain_type_axes jsonb default '{}';
