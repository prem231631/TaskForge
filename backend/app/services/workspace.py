
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import User, Workspace, WorkspaceMembership
from app.schemas.workspace import WorkspaceCreate


def create_workspace(
    db: Session,
    owner: User,
    workspace_data: WorkspaceCreate,
) -> Workspace:
    workspace = Workspace(
        name=workspace_data.name,
        description=workspace_data.description,
        owner_id=owner.id,
    )

    db.add(workspace)
    db.flush()

    membership = WorkspaceMembership(
        workspace_id=workspace.id,
        user_id=owner.id,
        role="owner",
    )

    db.add(membership)

    db.commit()
    db.refresh(workspace)

    return workspace


def list_user_workspaces(
    db: Session,
    user: User,
) -> list[tuple[Workspace, str]]:
    statement = (
        select(Workspace, WorkspaceMembership.role)
        .join(
            WorkspaceMembership,
            WorkspaceMembership.workspace_id == Workspace.id,
        )
        .where(WorkspaceMembership.user_id == user.id)
        .order_by(Workspace.created_at.desc(), Workspace.id.desc())
    )

    results = db.execute(statement).all()

    return [(workspace, role) for workspace, role in results]


def get_user_workspace(
    db: Session,
    workspace_id: int,
    user: User,
) -> tuple[Workspace, str] | None:
    statement = (
        select(Workspace, WorkspaceMembership.role)
        .join(
            WorkspaceMembership,
            WorkspaceMembership.workspace_id == Workspace.id,
        )
        .where(
            Workspace.id == workspace_id,
            WorkspaceMembership.user_id == user.id,
        )
    )

    result = db.execute(statement).first()

    if result is None:
        return None

    workspace, role = result
    return workspace, role
