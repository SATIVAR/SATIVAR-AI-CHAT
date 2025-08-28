'use client';

import React, { useState, useEffect } from 'react';
import { Association } from '@/lib/types';
import AssociationsDataTable from './associations-data-table';

interface AssociationsClientWrapperProps {
    initialData: Association[];
}

export default function AssociationsClientWrapper({ initialData }: AssociationsClientWrapperProps) {
    const [data, setData] = useState<Association[]>(initialData);
    
    // Sync with initialData changes from server
    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    return <AssociationsDataTable data={data} />;
}