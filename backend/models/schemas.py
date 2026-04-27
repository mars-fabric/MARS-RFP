"""
Pydantic models for file-related API endpoints.
"""

from typing import Optional, List
from pydantic import BaseModel


class FileItem(BaseModel):
    """Model representing a file or directory item."""
    name: str
    path: str
    type: str  # 'file' or 'directory'
    size: Optional[int] = None
    modified: Optional[float] = None
    mime_type: Optional[str] = None


class DirectoryListing(BaseModel):
    """Model representing a directory listing response."""
    path: str
    items: List[FileItem]
    parent: Optional[str] = None
