from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
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

    try:
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
    except Exception:
        db.rollback()
        raise

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


def get_workspace_member(
    db: Session,
    workspace_id: int,
    user_id: int,
) -> WorkspaceMembership | None:
    statement = select(WorkspaceMembership).where(
        WorkspaceMembership.workspace_id == workspace_id,
        WorkspaceMembership.user_id == user_id,
    )
    return db.scalar(statement)


def list_workspace_members(
    db: Session,
    workspace_id: int,
) -> list[tuple[User, str, object]]:
    statement = (
        select(
            User,
            WorkspaceMembership.role,
            WorkspaceMembership.joined_at,
        )
        .join(
            WorkspaceMembership,
            WorkspaceMembership.user_id == User.id,
        )
        .where(WorkspaceMembership.workspace_id == workspace_id)
        .order_by(
            WorkspaceMembership.joined_at.asc(),
            User.id.asc(),
        )
    )

    results = db.execute(statement).all()
    return [(user, role, joined_at) for user, role, joined_at in results]


def add_workspace_member(
    db: Session,
    workspace_id: int,
    email: str,
) -> WorkspaceMembership:
    normalized_email = email.strip().lower()

    user = db.scalar(
        select(User).where(User.email == normalized_email)
    )

    if user is None or not user.is_active:
        raise ValueError("No active account exists with this email.")

    existing_membership = get_workspace_member(
        db,
        workspace_id,
        user.id,
    )

    if existing_membership is not None:
        raise ValueError("This user is already a workspace member.")

    membership = WorkspaceMembership(
        workspace_id=workspace_id,
        user_id=user.id,
        role="member",
    )

    try:
        db.add(membership)
        db.commit()
        db.refresh(membership)
    except IntegrityError as exc:
        db.rollback()
        raise ValueError(
            "This user is already a workspace member."
        ) from exc

    return membership


def remove_workspace_member(
    db: Session,
    workspace_id: int,
    user_id: int,
) -> bool:
    membership = get_workspace_member(
        db,
        workspace_id,
        user_id,
    )

    if membership is None:
        return False

    if membership.role == "owner":
        raise ValueError("The workspace owner cannot be removed.")

    try:
        db.delete(membership)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return True
