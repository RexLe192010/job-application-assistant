# Knowledge Base Schema

This document defines the baseline field schema for local auto-fill.

## Base Fields

- `full_name`: Candidate full name
- `email`: Primary email address
- `phone`: Primary phone number
- `city`: Current city
- `linkedin`: LinkedIn profile URL
- `github`: GitHub profile URL

## Optional Extensions (Future)

- `portfolio_url`
- `work_authorization`
- `visa_status`
- `notice_period`
- `expected_salary`
- `open_answer_templates`

## Notes

- Keep values normalized (trimmed text, canonical URL format).
- For locale-specific formatting, store region metadata alongside each field.
