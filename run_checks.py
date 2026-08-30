#!/usr/bin/env python3
"""
TomerVest Local CI/CD & Quality Gate Runner
==========================================
Executes the exact validation pipeline run by GitHub Actions before pushing code:
1. Linting & Code Style (Ruff)
2. Static Application Security Testing (Bandit)
3. Dependency Vulnerability Audit (pip-audit)
4. Automated Unit & Integration Tests + Coverage (Pytest)
5. (Optional) End-to-End Browser Tests (Playwright)

Usage:
    python run_checks.py               # Standard CI suite (Steps 1-4)
    python run_checks.py --e2e         # Include Playwright browser tests
    python run_checks.py --fix         # Auto-fix linting issues before testing
    python run_checks.py --fast        # Run tests only (skip security/audit)
"""

import argparse
import os
import subprocess
import sys
import time

# ANSI Color Codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_banner(text: str):
    width = 68
    print(f"\n{CYAN}{'━' * width}{RESET}")
    print(f"{BOLD}{CYAN}  {text}{RESET}")
    print(f"{CYAN}{'━' * width}{RESET}\n")


def print_success(text: str):
    print(f"\n{GREEN}✅ {BOLD}{text}{RESET}\n")


def print_error(text: str):
    print(f"\n{RED}❌ {BOLD}{text}{RESET}\n")


def print_warning(text: str):
    print(f"{YELLOW}⚠️  {text}{RESET}")


def get_venv_bin(binary_name: str) -> str:
    """Find binary in virtualenv if active or present in workspace, else use PATH."""
    venv_paths = [
        os.path.join(os.path.dirname(__file__), "venv", "bin", binary_name),
        os.path.join(os.path.dirname(__file__), ".venv", "bin", binary_name),
    ]
    for path in venv_paths:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    return binary_name


def run_step(step_name: str, cmd: list[str], env_vars: dict | None = None) -> bool:
    """Runs a single quality gate command with clear UX and stop-on-failure."""
    print(f"{BOLD}[RUNNING]{RESET} {step_name}...")
    print(f"{YELLOW}$ {' '.join(cmd)}{RESET}")

    env = os.environ.copy()
    if env_vars:
        env.update(env_vars)

    start_time = time.time()
    result = subprocess.run(cmd, env=env)
    elapsed = time.time() - start_time

    if result.returncode == 0:
        print(f"{GREEN}✓ PASS{RESET} {step_name} ({elapsed:.2f}s)\n")
        return True
    else:
        print_error(f"FAILED: {step_name} (Exit code {result.returncode})")
        return False


def main():
    parser = argparse.ArgumentParser(description="TomerVest Local Pre-Push Quality Gate")
    parser.add_argument("--e2e", action="store_true", help="Include Playwright browser E2E test suite")
    parser.add_argument("--fix", action="store_true", help="Auto-fix linter issues using Ruff before checking")
    parser.add_argument("--fast", action="store_true", help="Run Pytest only (skip Bandit and pip-audit)")
    args = parser.parse_args()

    project_root = os.path.abspath(os.path.dirname(__file__))
    os.chdir(project_root)

    # Binaries
    ruff_bin = get_venv_bin("ruff")
    bandit_bin = get_venv_bin("bandit")
    pip_audit_bin = get_venv_bin("pip-audit")
    pytest_bin = get_venv_bin("pytest")

    # Isolated Testing Environment Variables
    ci_env = {
        "ENVIRONMENT": "testing",
        "DATABASE_URL": "sqlite:///:memory:",
        "SECRET_KEY": "local-ci-testing-secret-key",
        "ALGORITHM": "HS256",
        "TELEGRAM_TOKEN": "mock_test_telegram_token",
        "PYTHONPATH": f"{project_root}/backend:{project_root}",
    }

    print_banner("🚀 TOMERVEST - LOCAL CI/CD QUALITY GATE")
    total_start = time.time()

    # Step 0: Auto-fix if requested
    if args.fix:
        print_banner("🔧 Auto-fixing code format with Ruff")
        if not run_step("Ruff Autofix", [ruff_bin, "check", "--fix", "."]):
            sys.exit(1)
        if not run_step("Ruff Format", [ruff_bin, "format", "."]):
            sys.exit(1)

    # Step 1: Linter & Code Style
    print_banner("1/4 • Code Style & Linting Check (Ruff)")
    if not run_step("Ruff Linter", [ruff_bin, "check", "."]):
        print_warning("Tip: Run with --fix to automatically resolve formatting and import issues.")
        sys.exit(1)

    if not args.fast:
        # Step 2: Code Security Analysis
        print_banner("2/4 • Security Analysis (Bandit)")
        if not run_step("Bandit SAST", [bandit_bin, "-r", "backend/app/", "-ll"]):
            sys.exit(1)

        # Step 3: Dependency Vulnerability Audit
        print_banner("3/4 • Dependency Vulnerability Audit (pip-audit)")
        req_file = "backend/requirements.txt" if os.path.exists("backend/requirements.txt") else "requirements.txt"
        if not run_step("pip-audit", [pip_audit_bin, "-r", req_file]):
            sys.exit(1)
    else:
        print_warning("⚡ Fast mode active: Skipped Bandit & pip-audit.")

    # Step 4: Unit & Integration Tests with Coverage Gate
    print_banner("4/4 • Backend Automated Tests & Coverage Gate (Pytest)")
    pytest_cmd = [
        pytest_bin,
        "tests/unit",
        "tests/integration",
        "-v",
        "--cov=backend/app",
        "--cov-report=term-missing",
        "--cov-fail-under=70",
    ]
    if not run_step("Unit & Integration Tests", pytest_cmd, env_vars=ci_env):
        sys.exit(1)

    # Step 5: (Optional) E2E Playwright Tests
    if args.e2e:
        print_banner("🌐 Optional • End-to-End Playwright Browser Tests")
        if not run_step("Playwright E2E", [pytest_bin, "tests/e2e", "-v"], env_vars=ci_env):
            sys.exit(1)

    total_elapsed = time.time() - total_start
    print_banner(f"🎉 ALL QUALITY GATES PASSED SUCCESSFULLY in {total_elapsed:.2f}s")
    print_success("Your code is 100% compliant with CI/CD requirements. Safe to push to GitHub!")


if __name__ == "__main__":
    main()
