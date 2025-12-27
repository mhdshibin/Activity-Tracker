export interface Project {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    status: 'active' | 'completed' | 'archived';
    created_at: string;
}

export interface Objective {
    id: string;
    project_id: string;
    parent_id: string | null;
    title: string;
    is_completed: boolean;
    created_at: string;
    subObjectives?: Objective[]; // For recursive UI
}
