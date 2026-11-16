from enum import Enum
from typing import Dict, Any, Callable, Optional, List
from pydantic import BaseModel, Field

class PermissionLevel(str, Enum):
    READ_ONLY = "READ_ONLY"
    LOW_RISK = "LOW_RISK"
    SENSITIVE = "SENSITIVE"
    DESTRUCTIVE = "DESTRUCTIVE"

class ActionDefinition(BaseModel):
    id: str
    name: str
    description: str
    permission_level: PermissionLevel
    confirmation_required: bool = False
    parameters_schema: Dict[str, Any] = Field(default_factory=dict)
    timeout_seconds: int = 15

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "permissionLevel": self.permission_level.value,
            "confirmationRequired": self.confirmation_required,
            "parametersSchema": self.parameters_schema,
            "timeoutSeconds": self.timeout_seconds
        }

class ActionRegistry:
    def __init__(self):
        self._actions: Dict[str, ActionDefinition] = {}
        self._handlers: Dict[str, Callable] = {}
        self._register_default_actions()

    def register(self, definition: ActionDefinition, handler: Callable):
        self._actions[definition.id] = definition
        self._handlers[definition.id] = handler

    def get_action(self, action_id: str) -> Optional[ActionDefinition]:
        return self._actions.get(action_id)

    def get_handler(self, action_id: str) -> Optional[Callable]:
        return self._handlers.get(action_id)

    def list_actions(self) -> List[Dict[str, Any]]:
        return [action.to_dict() for action in self._actions.values()]

    def _register_default_actions(self):
        # 1. System Health
        self._actions["system.get_health"] = ActionDefinition(
            id="system.get_health",
            name="Get System Health",
            description="Retrieve real-time CPU, RAM, Disk, and Battery metrics.",
            permission_level=PermissionLevel.READ_ONLY,
            confirmation_required=False,
            parameters_schema={}
        )

        # 2. System Processes
        self._actions["system.get_processes"] = ActionDefinition(
            id="system.get_processes",
            name="List Running Processes",
            description="List top running applications by CPU and RAM consumption.",
            permission_level=PermissionLevel.READ_ONLY,
            confirmation_required=False,
            parameters_schema={"limit": {"type": "integer", "default": 10}}
        )

        # 3. Battery Status
        self._actions["system.get_battery"] = ActionDefinition(
            id="system.get_battery",
            name="Get Battery Status",
            description="Check current battery charge percentage and power line state.",
            permission_level=PermissionLevel.READ_ONLY,
            confirmation_required=False,
            parameters_schema={}
        )

        # 4. Capture Screenshot
        self._actions["system.capture_screenshot"] = ActionDefinition(
            id="system.capture_screenshot",
            name="Capture Screen Display",
            description="Capture current desktop screenshot with user consent for analysis.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={}
        )

        # 5. Open Application
        self._actions["app.open"] = ActionDefinition(
            id="app.open",
            name="Launch Allowlisted Application",
            description="Launch an authorized application such as VS Code, Chrome, or Notepad.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={
                "app_name": {"type": "string", "required": True},
                "argument": {"type": "string", "required": False}
            }
        )

        # 6. Close Application (Sensitive)
        self._actions["app.close"] = ActionDefinition(
            id="app.close",
            name="Terminate Application Process",
            description="Close an authorized running process safely.",
            permission_level=PermissionLevel.SENSITIVE,
            confirmation_required=True,
            parameters_schema={
                "app_name": {"type": "string", "required": True}
            }
        )

        # 7. Search Files in Allowlisted Workspace
        self._actions["files.search"] = ActionDefinition(
            id="files.search",
            name="Search Files in Workspace",
            description="Search for files in authorized folders and projects.",
            permission_level=PermissionLevel.READ_ONLY,
            confirmation_required=False,
            parameters_schema={
                "query": {"type": "string", "required": True},
                "folder": {"type": "string", "required": False}
            }
        )

        # 8. Read Allowed File
        self._actions["files.read"] = ActionDefinition(
            id="files.read",
            name="Read Permitted File",
            description="Read content of a text or code file within allowlisted project workspaces.",
            permission_level=PermissionLevel.READ_ONLY,
            confirmation_required=False,
            parameters_schema={
                "path": {"type": "string", "required": True},
                "max_lines": {"type": "integer", "default": 100}
            }
        )

        # 9. Delete File (Destructive)
        self._actions["files.delete"] = ActionDefinition(
            id="files.delete",
            name="Delete File",
            description="Permanently delete a specified file. Requires explicit approval.",
            permission_level=PermissionLevel.DESTRUCTIVE,
            confirmation_required=True,
            parameters_schema={
                "path": {"type": "string", "required": True}
            }
        )

        # 10. Lock PC
        self._actions["pc.lock"] = ActionDefinition(
            id="pc.lock",
            name="Lock Windows Desktop",
            description="Lock the current Windows workstation.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={}
        )

        # 11. PC Shutdown (Destructive)
        self._actions["pc.shutdown"] = ActionDefinition(
            id="pc.shutdown",
            name="Shutdown PC",
            description="Initiate clean system shutdown. Requires explicit confirmation.",
            permission_level=PermissionLevel.DESTRUCTIVE,
            confirmation_required=True,
            parameters_schema={
                "delay_seconds": {"type": "integer", "default": 60}
            }
        )

        # 12. PC Restart (Destructive)
        self._actions["pc.restart"] = ActionDefinition(
            id="pc.restart",
            name="Restart PC",
            description="Reboot system. Requires explicit confirmation.",
            permission_level=PermissionLevel.DESTRUCTIVE,
            confirmation_required=True,
            parameters_schema={
                "delay_seconds": {"type": "integer", "default": 60}
            }
        )

        # 13. Screen Vision & Multimodal Analysis
        self._actions["vision.analyze_screen"] = ActionDefinition(
            id="vision.analyze_screen",
            name="Inspect & Analyze Screen",
            description="Capture current desktop and analyze code, errors, or visual content using Vision AI.",
            permission_level=PermissionLevel.READ_ONLY,
            confirmation_required=False,
            parameters_schema={
                "prompt": {"type": "string", "default": "Explain what is visible on this screen in detail and assist the user."}
            }
        )

        # 14. Media Volume Set
        self._actions["media.volume_set"] = ActionDefinition(
            id="media.volume_set",
            name="Set Master Volume",
            description="Adjust Windows master volume level between 0 and 100 percent.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={
                "level": {"type": "integer", "required": True, "description": "Volume percentage from 0 to 100"}
            }
        )

        # 15. Media Volume Mute
        self._actions["media.volume_mute"] = ActionDefinition(
            id="media.volume_mute",
            name="Mute / Unmute Volume",
            description="Toggle master audio mute state.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={}
        )

        # 16. Media Play/Pause
        self._actions["media.play_pause"] = ActionDefinition(
            id="media.play_pause",
            name="Play / Pause Media",
            description="Toggle playback of Spotify, YouTube, or current media player.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={}
        )

        # 17. Media Next Track
        self._actions["media.next_track"] = ActionDefinition(
            id="media.next_track",
            name="Skip to Next Track",
            description="Skip to next audio/video track.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={}
        )

        # 18. Media Previous Track
        self._actions["media.previous_track"] = ActionDefinition(
            id="media.previous_track",
            name="Previous Track",
            description="Skip to previous audio/video track.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={}
        )

        # 19. Media Play YouTube
        self._actions["media.play_youtube"] = ActionDefinition(
            id="media.play_youtube",
            name="Play Song on YouTube",
            description="Open default browser to search or play song/video on YouTube.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={
                "query": {"type": "string", "required": True, "description": "Song, artist, or topic to play"}
            }
        )

        # 20. Morning / Daily Briefing
        self._actions["system.morning_briefing"] = ActionDefinition(
            id="system.morning_briefing",
            name="JARVIS Morning Briefing",
            description="Generate a daily status report with time, weather, battery, and reminders.",
            permission_level=PermissionLevel.READ_ONLY,
            confirmation_required=False,
            parameters_schema={}
        )

        # 21. Smart File Organizer
        self._actions["files.organize_folder"] = ActionDefinition(
            id="files.organize_folder",
            name="Smart File Organizer",
            description="Clean and categorize files in Downloads or Desktop into organized subfolders.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={
                "folder": {"type": "string", "default": "Downloads", "description": "Folder name: 'Downloads' or 'Desktop'"}
            }
        )

        # 22. Save Long-term Memory
        self._actions["memory.save"] = ActionDefinition(
            id="memory.save",
            name="Store Long-term Memory",
            description="Save a persistent note, fact, secret, or preference to Luna's database.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={
                "key": {"type": "string", "required": True},
                "value": {"type": "string", "required": True},
                "category": {"type": "string", "default": "general"}
            }
        )

        # 23. Search Long-term Memory
        self._actions["memory.search"] = ActionDefinition(
            id="memory.search",
            name="Search Long-term Memory",
            description="Retrieve stored knowledge, notes, or facts.",
            permission_level=PermissionLevel.READ_ONLY,
            confirmation_required=False,
            parameters_schema={
                "query": {"type": "string", "required": True}
            }
        )

        # 24. Send WhatsApp Message to Phone Number
        self._actions["communication.send_whatsapp"] = ActionDefinition(
            id="communication.send_whatsapp",
            name="Send WhatsApp Message",
            description="Open WhatsApp to send a message to a specific phone number.",
            permission_level=PermissionLevel.LOW_RISK,
            confirmation_required=False,
            parameters_schema={
                "phone_number": {"type": "string", "required": True, "description": "Recipient phone number with or without country code"},
                "message": {"type": "string", "required": True, "description": "Message text to send"}
            }
        )

        # 25. Web / Google Search
        self._actions["web.search"] = ActionDefinition(
            id="web.search",
            name="Search the Web",
            description="Open default browser and search Google for any query, news, or fact.",
            permission_level=PermissionLevel.READ_ONLY,
            confirmation_required=False,
            parameters_schema={
                "query": {"type": "string", "required": True, "description": "Topic, question, or query to search on Google"}
            }
        )

action_registry = ActionRegistry()
