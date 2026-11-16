from typing import List, Dict, Any

LUNA_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "system_get_health",
            "description": "Get current Windows PC CPU usage, memory utilization, disk usage, and host details.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "system_get_battery",
            "description": "Get current battery level percentage and power plug status.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "app_open",
            "description": "Launch an authorized application such as VS Code, Chrome, Notepad, Calculator, or Explorer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "app_name": {
                        "type": "string",
                        "description": "Name or alias of application (e.g. 'code', 'vscode', 'chrome', 'notepad', 'calc', 'explorer')"
                    },
                    "argument": {
                        "type": "string",
                        "description": "Optional file path, folder, or project directory to open with the app (e.g. 'd:\\luna')"
                    }
                },
                "required": ["app_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "app_close",
            "description": "Close or terminate an authorized application. Requires explicit confirmation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "app_name": {
                        "type": "string",
                        "description": "Application executable or name to close (e.g. 'notepad', 'chrome')"
                    }
                },
                "required": ["app_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "files_search",
            "description": "Search for files by keyword in authorized workspace directories.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Filename or keyword to find"
                    },
                    "folder": {
                        "type": "string",
                        "description": "Root folder to search within"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "system_capture_screenshot",
            "description": "Capture the user's active screen to inspect an error, UI, or troubleshoot.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "pc_lock",
            "description": "Lock the Windows desktop workstation immediately.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "vision_analyze_screen",
            "description": "Inspect and analyze the user's screen using Vision AI (reads code, diagnoses errors, summarizes documents, and inspects UI).",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "Specific question or instruction about the screen content (e.g. 'Explain the error visible', 'Review this code')"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "media_volume_set",
            "description": "Set Windows master volume level between 0 and 100 percent.",
            "parameters": {
                "type": "object",
                "properties": {
                    "level": {
                        "type": "integer",
                        "description": "Volume percentage integer from 0 to 100"
                    }
                },
                "required": ["level"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "media_volume_mute",
            "description": "Toggle master volume mute / unmute.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "media_play_pause",
            "description": "Toggle play/pause on Spotify, YouTube, VLC, or active media player.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "media_next_track",
            "description": "Skip to the next music track or video.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "media_previous_track",
            "description": "Skip to the previous music track or video.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "media_play_youtube",
            "description": "Search and play a song, artist, video, or playlist on YouTube in the browser.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Song name, artist, or topic to play"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "system_morning_briefing",
            "description": "Deliver a complete JARVIS-style daily/morning briefing (Time, Date, Weather, Battery, CPU, and active reminders).",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "files_organize_folder",
            "description": "Automatically organize and clean files in Downloads or Desktop into categorized folders (Documents, Images, Media, Installers, Code).",
            "parameters": {
                "type": "object",
                "properties": {
                    "folder": {
                        "type": "string",
                        "description": "Target folder name ('Downloads' or 'Desktop')"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "memory_search",
            "description": "Search stored personal notes, passwords, project facts, or reminders in Luna's long-term database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Keyword or fact to look up"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": "Remember an important user preference, project detail, note, or fact.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": [
                            "user_preference",
                            "communication_preference",
                            "frequently_used_command",
                            "project_context",
                            "personal_note"
                        ]
                    },
                    "key": {
                        "type": "string",
                        "description": "Short identifier (e.g. 'project_name', 'coffee_preference', 'preferred_ide')"
                    },
                    "value": {
                        "type": "string",
                        "description": "The information to remember"
                    }
                },
                "required": ["category", "key", "value"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "communication_send_whatsapp",
            "description": "Open WhatsApp and send a message to a given phone number (e.g. '9876543210-ku message pannu: Hello boss').",
            "parameters": {
                "type": "object",
                "properties": {
                    "phone_number": {
                        "type": "string",
                        "description": "Target phone number (e.g. '9876543210' or '+919876543210')"
                    },
                    "message": {
                        "type": "string",
                        "description": "Text message to send"
                    }
                },
                "required": ["phone_number", "message"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the live web or Google for any query, news, weather, or information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search terms to look up on Google"
                    }
                },
                "required": ["query"]
            }
        }
    }
]
