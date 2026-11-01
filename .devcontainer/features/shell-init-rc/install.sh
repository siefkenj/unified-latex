#!/bin/bash
set -e

# Initialize shell rc files (.bashrc, .zshrc, .profile) to unset stale environment variables
# that may be injected by VS Code debugger or other tools.
# This ensures every new shell session starts with a clean environment.
#
# NOTE: This feature runs as root. We must write to the non-root user's home directory.
# _REMOTE_USER is set by the devcontainer framework to the name of the remote user.
# Fall back to "vscode" if the variable is not set.

TARGET_USER="${_REMOTE_USER:-vscode}"
TARGET_HOME=$(getent passwd "$TARGET_USER" | cut -d: -f6)

if [ -z "$TARGET_HOME" ]; then
    echo "WARNING: Could not determine home directory for user '$TARGET_USER'; skipping shell rc init"
    exit 0
fi

for shell_rc in "$TARGET_HOME/.bashrc" "$TARGET_HOME/.zshrc" "$TARGET_HOME/.profile"; do
    if [ -f "$shell_rc" ]; then
        # Only append if not already present (avoid duplicates)
        if ! grep -q "unset NODE_OPTIONS VSCODE_INSPECTOR_OPTIONS" "$shell_rc"; then
            echo 'unset NODE_OPTIONS VSCODE_INSPECTOR_OPTIONS' >> "$shell_rc"
        fi
    fi
done

echo "Shell rc files initialized with NODE_OPTIONS and VSCODE_INSPECTOR_OPTIONS cleanup"