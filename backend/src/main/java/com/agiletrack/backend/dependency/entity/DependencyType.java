package com.agiletrack.backend.dependency.entity;

/**
 * The kind of relationship an edge represents.
 *
 * <p>Only {@code BLOCKS} exists today. It is modelled as an enum rather than assumed, so that a
 * later relationship type (RELATES_TO, DUPLICATES) can be added without a migration that has to
 * reinterpret existing rows — and so cycle detection can stay restricted to the edge types where
 * a cycle is actually a contradiction.
 */
public enum DependencyType {

    /** source BLOCKS target: the target cannot complete while the source is unresolved. */
    BLOCKS
}
