'use client';

import { useState } from 'react';
import { Objective } from '@/types/projects';
import { supabase } from '@/utils/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronDown, Plus, Trash2, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ObjectiveTreeProps {
    objectives: Objective[];
    parentId: string | null;
    projectId: string;
    level?: number;
    onUpdate: () => void;
}

export function ObjectiveTree({ objectives, parentId, projectId, level = 0, onUpdate }: ObjectiveTreeProps) {
    // Filter objectives that belong to this level (match parentId)
    const currentLevelObjectives = objectives.filter(obj => obj.parent_id === parentId);

    // State to track expanded items (for UI cleanliness, though we could default open)
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
    const [addingTo, setAddingTo] = useState<string | null>(null); // ID of parent we are adding to, or 'root'
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Helper to get all descendant IDs recursively
    const getDescendantIds = (parentId: string, allObjectives: Objective[]): string[] => {
        const children = allObjectives.filter(o => o.parent_id === parentId);
        let ids = children.map(c => c.id);
        for (const child of children) {
            ids = [...ids, ...getDescendantIds(child.id, allObjectives)];
        }
        return ids;
    };

    const toggleComplete = async (obj: Objective) => {
        const newState = !obj.is_completed;
        // Cascade: Update the target AND all its descendants
        const idsToUpdate = [obj.id, ...getDescendantIds(obj.id, objectives)];

        try {
            await supabase
                .from('objectives')
                .update({ is_completed: newState })
                .in('id', idsToUpdate);
            onUpdate();
        } catch (error) {
            console.error('Error toggling objective:', error);
        }
    };

    const startEditing = (obj: Objective) => {
        setEditingId(obj.id);
        setEditingTitle(obj.title);
    };

    const saveEditing = async (id: string) => {
        if (!editingTitle.trim()) return;
        try {
            await supabase
                .from('objectives')
                .update({ title: editingTitle })
                .eq('id', id);
            setEditingId(null);
            onUpdate();
        } catch (error) {
            console.error('Error updating objective:', error);
        }
    };

    const deleteObjective = async (id: string) => {
        if (!confirm('Are you sure? This will delete all sub-objectives as well.')) return;
        try {
            await supabase.from('objectives').delete().eq('id', id);
            onUpdate();
        } catch (error) {
            console.error('Error deleting objective:', error);
        }
    };

    const addObjective = async (targetParentId: string | null) => {
        if (!newObjectiveTitle.trim()) return;
        try {
            await supabase.from('objectives').insert({
                project_id: projectId,
                parent_id: targetParentId,
                title: newObjectiveTitle,
            });
            setNewObjectiveTitle('');
            setAddingTo(null);
            onUpdate();
            // If adding to a parent, ensure it is expanded
            if (targetParentId) {
                setExpanded(prev => ({ ...prev, [targetParentId]: true }));
            }
        } catch (error) {
            console.error('Error adding objective:', error);
        }
    };

    if (currentLevelObjectives.length === 0 && level > 0 && addingTo !== parentId) {
        return null;
    }

    return (
        <div className={cn("pl-4", level === 0 ? "pl-0" : "border-l ml-2")}>
            {currentLevelObjectives.map(obj => {
                const hasChildren = objectives.some(o => o.parent_id === obj.id);
                const isExpanded = expanded[obj.id] || false;
                const isEditing = editingId === obj.id;

                return (
                    <div key={obj.id} className="mb-2">
                        <div className="flex items-center gap-2 group py-1 hover:bg-accent/30 rounded px-2">
                            {/* Expand/Collapse Toggle */}
                            <button
                                onClick={() => toggleExpand(obj.id)}
                                className={cn("p-1 rounded hover:bg-muted", hasChildren ? "opacity-100" : "opacity-0")}
                                disabled={!hasChildren}
                            >
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </button>

                            {/* Checkbox */}
                            <Checkbox
                                checked={obj.is_completed}
                                onCheckedChange={() => toggleComplete(obj)}
                            />

                            {/* Title (or Edit Input) */}
                            {isEditing ? (
                                <div className="flex-1 flex gap-2">
                                    <Input
                                        autoFocus
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEditing(obj.id);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        className="h-7 text-sm"
                                    />
                                    <Button size="sm" className="h-7 px-2" onClick={() => saveEditing(obj.id)}>Save</Button>
                                </div>
                            ) : (
                                <span
                                    onClick={() => hasChildren && toggleExpand(obj.id)}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(obj);
                                    }}
                                    className={cn(
                                        "flex-1 text-sm font-medium select-none cursor-text",
                                        obj.is_completed && "line-through text-muted-foreground",
                                        hasChildren && "cursor-pointer hover:font-semibold transition-all"
                                    )}
                                >
                                    {obj.title}
                                </span>
                            )}

                            {/* Actions */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => startEditing(obj)}>
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setAddingTo(obj.id)}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Sub-objective
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => deleteObjective(obj.id)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Recursive Render Children */}
                        {(isExpanded || addingTo === obj.id) && (
                            <div className="mt-1">
                                <ObjectiveTree
                                    objectives={objectives}
                                    parentId={obj.id}
                                    projectId={projectId}
                                    level={level + 1}
                                    onUpdate={onUpdate}
                                />

                                {/* Inline Add Form for Sub-objectives */}
                                {addingTo === obj.id && (
                                    <div className="flex items-center gap-2 pl-8 mt-2">
                                        <Input
                                            autoFocus
                                            placeholder="New sub-objective..."
                                            value={newObjectiveTitle}
                                            onChange={(e) => setNewObjectiveTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') addObjective(obj.id);
                                                if (e.key === 'Escape') setAddingTo(null);
                                            }}
                                            className="h-8"
                                        />
                                        <Button size="sm" onClick={() => addObjective(obj.id)}>Add</Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Root Level Add Button */}
            {level === 0 && (
                <div className="mt-4">
                    {addingTo === 'root' ? (
                        <div className="flex items-center gap-2">
                            <Input
                                autoFocus
                                placeholder="New primary objective..."
                                value={newObjectiveTitle}
                                onChange={(e) => setNewObjectiveTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') addObjective(null);
                                    if (e.key === 'Escape') setAddingTo(null);
                                }}
                            />
                            <Button onClick={() => addObjective(null)}>Add Objective</Button>
                        </div>
                    ) : (
                        <Button variant="outline" className="w-full border-dashed" onClick={() => setAddingTo('root')}>
                            <Plus className="mr-2 h-4 w-4" /> Add Objective
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
